/**
 * The `image` column in Supabase already stores a full Cloudinary
 * delivery URL (e.g. https://res.cloudinary.com/<cloud>/image/upload/<path>),
 * not a bare public_id. This inserts resize/format transformations into
 * that existing URL rather than building one from scratch.
 */
export function cloudinaryTransform(
  url: string | null | undefined,
  opts: { width?: number; height?: number } = {}
): string | undefined {
  if (!url) return undefined;
  const { width, height } = opts;

  const transforms: string[] = ['f_auto', 'q_auto'];
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (width || height) transforms.push('c_fill');

  if (!url.includes('/upload/')) return url; // not a Cloudinary URL, leave as-is
  return url.replace('/upload/', `/upload/${transforms.join(',')}/`);
}