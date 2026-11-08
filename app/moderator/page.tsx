import { redirect } from 'next/navigation';

// Old site URL: /moderator. Moderators now use the Admin panel, which
// shows them only the tabs they are allowed to use.
export default function ModeratorRedirect() {
  redirect('/admin');
}
