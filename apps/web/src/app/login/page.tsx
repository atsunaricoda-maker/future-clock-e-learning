import { redirect } from 'next/navigation';

export default function LoginPage() {
  // Redirect /login to /sign-in
  redirect('/sign-in');
}
