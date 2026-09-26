'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Post } from '@/lib/supabase';

type Ctx = {
  savedPosts: Post[];
  isSaved: (id: string) => boolean;
  toggleSaved: (post: Post) => void;
};

const SavedCtx = createContext<Ctx | null>(null);
const KEY = 'naija_saved_posts_v1';

// This is a deliberate substitution for the original's Supabase-backed
// saved_posts table (which is keyed by logged-in user email — auth
// isn't built yet). This version works immediately, per-device, via
// localStorage. Once real auth exists, this can be swapped for the
// original per-account mechanism without changing how PostCard or the
// Saved page consume it.
export function SavedPostsProvider({ children }: { children: React.ReactNode }) {
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSavedPosts(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(savedPosts));
    } catch {}
  }, [savedPosts, hydrated]);

  const isSaved = (id: string) => savedPosts.some((p) => p.id === id);
  const toggleSaved = (post: Post) => {
    setSavedPosts((prev) =>
      prev.some((p) => p.id === post.id) ? prev.filter((p) => p.id !== post.id) : [post, ...prev].slice(0, 200)
    );
  };

  return <SavedCtx.Provider value={{ savedPosts, isSaved, toggleSaved }}>{children}</SavedCtx.Provider>;
}

export function useSavedPosts() {
  const ctx = useContext(SavedCtx);
  if (!ctx) throw new Error('useSavedPosts must be used within SavedPostsProvider');
  return ctx;
}
