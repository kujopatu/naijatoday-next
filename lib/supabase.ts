import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const isBrowser = typeof window !== 'undefined';

// One shared client for the whole app. In the browser it keeps the login
// session (localStorage) and refreshes tokens, exactly like the original
// Vite app's single client — so a member who is logged in stays logged in
// everywhere, and RLS sees them as themselves. On the server (Server
// Components, generateMetadata, sitemap) it stays stateless and anonymous.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: isBrowser,
    autoRefreshToken: isBrowser,
    detectSessionInUrl: isBrowser,
  },
});

// Matches the real `posts` table in Supabase. There is no `slug` column —
// see lib/posts.ts for how article URLs are derived and matched, the same
// way the original Vite app does it.
export type Post = {
  id: string; // uuid
  title: string;
  excerpt: string | null;
  content: string;
  category: string;
  image: string | null; // full Cloudinary delivery URL, not a bare public_id
  author: string | null;
  read_time: string | null;
  breaking: boolean;
  hot: boolean;
  featured: boolean;
  published: boolean;
  views: number;
  upvotes: number;
  comments: number;
  created_at: string;
  tags: string[] | null;
  sponsored: boolean;
  updated_at: string;
};
