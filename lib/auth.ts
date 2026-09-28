// Same admin email as the original app. NOTE: this only decides what the
// UI shows (badges, menu labels). The real protection is Supabase RLS on
// the database, which checks the logged-in user's JWT server-side — a
// visitor cannot gain admin powers by changing anything in their browser.
export const ADMIN_EMAIL = 'kujopatu@gmail.com';
