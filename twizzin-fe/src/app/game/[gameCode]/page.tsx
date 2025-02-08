'use client';

import { redirect } from 'next/navigation';
import { useParams } from 'next/navigation';

export default function GameRedirectPage() {
  const { gameId } = useParams();
  redirect(`/en/game/${gameId}`);
}
