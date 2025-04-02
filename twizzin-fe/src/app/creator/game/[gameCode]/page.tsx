'use client';

import { redirect } from 'next/navigation';
import { useParams } from 'next/navigation';

export default function CreatorGameRedirectPage() {
  const { gameCode } = useParams();
  redirect(`/en/creator/game/${gameCode}`);
}
