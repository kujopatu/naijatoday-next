import { redirect } from 'next/navigation';

// Old site URL: /userprofile  →  new: /profile
export default function UserProfileRedirect() {
  redirect('/profile');
}
