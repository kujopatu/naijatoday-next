import { supabase, Post } from "@/lib/supabase";

/**
 * Convert a post title into the URL slug used by the site.
 *
 * Example:
 * "Tinubu Announces New Economic Reforms!"
 * -> "tinubu-announces-new-economic-reforms"
 */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Get a published post by category and title-derived slug.
 *
 * The Supabase `posts` table does not contain a slug column,
 * so we retrieve published posts in the requested category and
 * find the post whose title produces the requested slug.
 */
export async function getPostBySlug(
  category: string,
  slug: string
): Promise<Post | null> {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("category", category)
      .eq("published", true)
      .order("created_at", { ascending: false });

    if (error || !data) {
      console.error("Error fetching post:", error);
      return null;
    }

    const post = (data as Post[]).find(
      (item) => slugify(item.title) === slug
    );

    return post ?? null;
  } catch (error) {
    console.error("Unexpected error fetching post:", error);
    return null;
  }
}

/**
 * Return paths for published posts so Next.js can pre-render them.
 */
export async function getAllPublishedPostPaths(): Promise<
  Array<{ category: string; slug: string }>
> {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("category, title")
      .eq("published", true)
      .order("created_at", { ascending: false });

    if (error || !data) {
      console.error("Error fetching post paths:", error);
      return [];
    }

    return data
      .map((post) => ({
        category: post.category,
        slug: slugify(post.title),
      }))
      .filter((post) => post.category && post.slug);
  } catch (error) {
    console.error("Unexpected error fetching post paths:", error);
    return [];
  }
}