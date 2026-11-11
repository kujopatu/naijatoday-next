// Authenticated votes use a normalized account email. Anonymous IDs remain
// available for non-voting features that need a temporary visitor label.
export function getVoterKey(userEmail?: string | null): string {
  if (userEmail) return userEmail.toLowerCase();
  try {
    let id = localStorage.getItem('naija_anon_id');
    if (!id) {
      id = 'anon_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('naija_anon_id', id);
    }
    return id;
  } catch {
    return 'anon_fallback';
  }
}
