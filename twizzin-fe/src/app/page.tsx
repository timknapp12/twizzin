'use client';

import { redirect } from 'next/navigation';
import { useAppContext } from '@/contexts';

export default function RootPage() {
  const { language } = useAppContext();
  redirect(`/${language}`);
}
