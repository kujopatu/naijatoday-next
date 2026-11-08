import { redirect } from 'next/navigation';

// Old site URL: /tag/<tag>  →  new: /search?tag=<tag>
export default async function TagRedirect({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  let t = tag;
  try { t = decodeURIComponent(tag); } catch { /* keep raw */ }
  redirect(`/search?tag=${encodeURIComponent(t)}`);
}
