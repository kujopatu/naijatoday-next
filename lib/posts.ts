import { supabase, Post } from './supabase';

export function slugify(title: string | null | undefined): string {
  if (!title) return 'article';
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

export function categorySlug(category: string | null | undefined): string {
  if (!category) return 'news';
  return (
    String(category)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-') || 'news'
  );
}

export function postPath(post: Pick<Post, 'id' | 'title' | 'category'>): string {
  return `/article/${categorySlug(post.category)}/${slugify(post.title)}-${String(
    post.id
  ).slice(-6)}`;
}

export async function getPostBySlug(
  categoryParam: string,
  slugParam: string
): Promise<Post | null> {
  const idSuffix = slugParam.slice(-6).toLowerCase();
  if (idSuffix.length !== 6) return null;

  try {
    const { data: candidates, error } = await supabase
      .from('posts')
      .select('id, category')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(3000);

    if (error || !candidates) return null;

    const match = candidates.find(
      (p) =>
        categorySlug(p.category) === categoryParam &&
        String(p.id).slice(-6).toLowerCase() === idSuffix
    );
    if (!match) return null;

    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', match.id)
      .single();

    if (fetchError || !post) return null;
    return post as Post;
  } catch {
    return null;
  }
}

export async function getAllPublishedPostPaths(): Promise
  { category: string; slug: string }[]
> {
  try {
    const { data } = await supabase
      .from('posts')
      .select('id, title, category')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(200);

    return (data ?? []).map((p) => ({
      category: categorySlug(p.category),
      slug: `${slugify(p.title)}-${String(p.id).slice(-6)}`,
    }));
  } catch {
    return [];
  }
}