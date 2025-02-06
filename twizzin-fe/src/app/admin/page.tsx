import { redirect } from 'next/navigation';
import { useAppContext } from '@/contexts';

export default function AdminRedirectPage() {
  const { language } = useAppContext();
  redirect(`/${language}/admin`);
}
