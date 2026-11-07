// Same idea as the original: a logged-in member votes under their email,
// everyone else under a random device id kept in the browser, so one device
// can't vote twice on the same thing.
export function getVoterKey(userEmail?: string | null): string {
  if (userEmail) return userEmail;
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
