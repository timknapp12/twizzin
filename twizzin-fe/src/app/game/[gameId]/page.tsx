import { redirect } from 'next/navigation';
import { useAppContext } from '@/contexts';
import { useParams } from 'next/navigation';

export default function GameRedirectPage() {
  const { language } = useAppContext();
  const { gameId } = useParams();
  redirect(`/${language}/game/${gameId}`);
}
