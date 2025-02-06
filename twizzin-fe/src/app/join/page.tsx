import { redirect } from 'next/navigation';
import { useAppContext } from '@/contexts';

export default function JoinRedirectPage() {
  const { language } = useAppContext();
  redirect(`/${language}/join`);
}
