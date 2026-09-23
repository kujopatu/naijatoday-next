import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Server-side client — safe to use in Server Components, Route Handlers,
// and generateMetadata(). No client-side useEffect fetching needed anymore.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

// Adjust field names to match your actual `articles` table.
export type Article = {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null; // Cloudinary public_id
  author: string | null;
  published_at: string;
  updated_at: string;
};
