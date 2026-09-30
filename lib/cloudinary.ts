/**
 * The `image` column in Supabase stores one of two things: a full
 * Cloudinary delivery URL for a real uploaded/pasted image, or a plain
 * emoji character (the admin form's default, e.g. "📰") when no image was
 * set. This inserts resize/format transformations for a real URL, and
 * returns undefined for anything else — callers fall back to rendering
 * `post.image` itself as an emoji/icon rather than passing it to <img>.
 */
export function cloudinaryTransform(
  url: string | null | undefined,
  opts: { width?: number; height?: number } = {}
): string | undefined {
  if (!url || !url.startsWith('http')) return undefined;
  const { width, height } = opts;

  const transforms: string[] = ['f_auto', 'q_auto'];
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (width || height) transforms.push('c_fill');

  if (!url.includes('/upload/')) return url; // an http(s) URL, but not a Cloudinary one
  return url.replace('/upload/', `/upload/${transforms.join(',')}/`);
}
