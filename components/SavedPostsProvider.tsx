'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Post, supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';

type Ctx = {
  savedPosts: Post[];
  isSaved: (id: string) => boolean;
  toggleSaved: (post: Post) => void;
};

const SavedCtx = createContext<Ctx | null>(null);
const KEY = 'naija_saved_posts_v1';

// Two modes, matching the original app's own behavior:
//  - Logged in: the real `saved_posts` table (user_email, post_id) is the
//    source of truth, same as the original — works across devices.
//  - Signed out: localStorage, so bookmarking still works for anonymous
//    readers. (The original has no logic to migrate local saves into an
//    account on login, so neither does this — consistent, not a regression.)
export function SavedPostsProvider({ children }: { children: React.ReactNode }) {
  const { loggedIn, userEmail, loading: authLoading } = useAuth();
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Local (signed-out) load/save.
  useEffect(() => {
    if (authLoading || loggedIn) return;
    try {
      const raw = localStorage.getItem(KEY);
      setSavedPosts(raw ? JSON.parse(raw) : []);
    } catch {
      setSavedPosts([]);
    }
    setHydrated(true);
  }, [authLoading, loggedIn]);

  useEffect(() => {
    if (!hydrated || loggedIn) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(savedPosts));
    } catch {}
  }, [savedPosts, hydrated, loggedIn]);

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
    const currentlySaved = isSaved(post.id);

    // Optimistic UI update either way.
    setSavedPosts((prev) =>
      currentlySaved ? prev.filter((p) => p.id !== post.id) : [post, ...prev].slice(0, 200)
    );

    if (loggedIn && userEmail) {
      if (currentlySaved) {
        supabase.from('saved_posts').delete().eq('user_email', userEmail).eq('post_id', post.id).then(
          () => {},
          () => {}
        );
      } else {
        supabase.from('saved_posts').insert([{ user_email: userEmail, post_id: post.id }]).then(
          () => {},
          () => {}
        );
      }
    }
  };

  return <SavedCtx.Provider value={{ savedPosts, isSaved, toggleSaved }}>{children}</SavedCtx.Provider>;
}

export function useSavedPosts() {
  const ctx = useContext(SavedCtx);
  if (!ctx) throw new Error('useSavedPosts must be used within SavedPostsProvider');
  return ctx;
}
