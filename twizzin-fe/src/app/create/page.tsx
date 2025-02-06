import { redirect } from 'next/navigation';
import { useAppContext } from '@/contexts';

export default function CreateRedirectPage() {
  const { language } = useAppContext();
  redirect(`/${language}/create`);
}
