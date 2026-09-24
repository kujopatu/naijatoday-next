import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

// Matches the real `posts` table in Supabase. There is no `slug` column —
// see lib/posts.ts for how article URLs are derived and matched.
export type Post = {
  id: string;
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