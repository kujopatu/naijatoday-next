import { supabase } from './supabase';

// Same behaviour as the original: if the banned_users table can't be read,
// posting is allowed (fail open) rather than locking everyone out.
export async function isBanned(email: string): Promise<boolean> {
  if (!email) return false;
  try {
    const { data } = await supabase
      .from('banned_users')
      .select('email')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? 's' : ''} ago`;
}
