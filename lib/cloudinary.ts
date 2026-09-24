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

  if (!url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/${transforms.join(',')}/`);
}