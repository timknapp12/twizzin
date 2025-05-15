'use client';

import { redirect } from 'next/navigation';
import { useParams } from 'next/navigation';

export default function GameRedirectPage() {
  const { gameCode } = useParams();
  redirect(`/en/game/${gameCode}`);
}
