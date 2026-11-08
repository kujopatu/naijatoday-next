import { redirect } from 'next/navigation';

// Old site URL: /search/<query>  →  new: /search?q=<query>
export default async function SearchRedirect({ params }: { params: Promise<{ q: string }> }) {
  const { q } = await params;
  let t = q;
  try { t = decodeURIComponent(q); } catch { /* keep raw */ }
  redirect(`/search?q=${encodeURIComponent(t)}`);
}
