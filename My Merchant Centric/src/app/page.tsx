import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function RootPage() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('brasa_session');

  if (sessionToken?.value) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
