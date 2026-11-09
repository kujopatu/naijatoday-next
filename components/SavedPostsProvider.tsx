'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Post, supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';
import { useToast } from './ToastProvider';

type Ctx = {
  savedPosts: Post[];
  isSaved: (id: string) => boolean;
  toggleSaved: (post: Post) => void;
};

const SavedCtx = createContext<Ctx | null>(null);

// Saving needs an account (as on the original site): the `saved_posts` table
// (user_email, post_id) is the source of truth, so saves follow the member
// across devices. Signed-out visitors are asked to log in.
export function SavedPostsProvider({ children }: { children: React.ReactNode }) {
  const { loggedIn, userEmail, loading: authLoading, openModal } = useAuth();
  const { showToast } = useToast();
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);

  // Signed out: nothing is saved (clears any list left over from a previous login).
  useEffect(() => {
    if (!authLoading && !loggedIn) setSavedPosts([]);
  }, [authLoading, loggedIn]);

  // Remote (signed-in) load, from the real table.
  useEffect(() => {
    if (authLoading || !loggedIn || !userEmail) return;
    let active = true;
    (async () => {
      try {
        const { data: refs, error } = await supabase
          .from('saved_posts')
          .select('post_id')
          .eq('user_email', userEmail);
        if (error || !refs || refs.length === 0) {
          if (active) setSavedPosts([]);
          return;
        }
        const ids = refs.map((r: { post_id: string }) => r.post_id);
        const { data: posts } = await supabase.from('posts').select('*').in('id', ids);
        if (active) setSavedPosts((posts ?? []) as Post[]);
      } catch {
        if (active) setSavedPosts([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [authLoading, loggedIn, userEmail]);

  const isSaved = (id: string) => savedPosts.some((p) => p.id === id);

  const toggleSaved = (post: Post) => {
    if (!loggedIn || !userEmail) {
      showToast('Please log in to save articles 🔖');
      openModal('login');
      return;
    }
    const currentlySaved = isSaved(post.id);

    // Optimistic UI update; rolled back if the database refuses.
    setSavedPosts((prev) =>
      currentlySaved ? prev.filter((p) => p.id !== post.id) : [post, ...prev].slice(0, 200)
    );
    const rollback = (message: string) => {
      setSavedPosts((prev) =>
        currentlySaved ? [post, ...prev.filter((p) => p.id !== post.id)] : prev.filter((p) => p.id !== post.id)
      );
      showToast('Could not update saved articles: ' + message.slice(0, 140));
    };

    const req = currentlySaved
      ? supabase.from('saved_posts').delete().eq('user_email', userEmail).eq('post_id', post.id)
      : supabase.from('saved_posts').insert([{ user_email: userEmail, post_id: post.id }]);
    req.then(
      ({ error }) => {
        if (error && !/duplicate|unique/i.test(error.message)) rollback(error.message);
        else showToast(currentlySaved ? 'Removed from saved' : 'Saved for later 🔖');
      },
      () => rollback('network error')
    );
  };

  return <SavedCtx.Provider value={{ savedPosts, isSaved, toggleSaved }}>{children}</SavedCtx.Provider>;
}

export function useSavedPosts() {
  const ctx = useContext(SavedCtx);
  if (!ctx) throw new Error('useSavedPosts must be used within SavedPostsProvider');
  return ctx;
}
