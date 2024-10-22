'use client';
import { useLanguageRedirect, LoadingSpinner } from '@/utils/languageRedirect';

export default function RootPage() {
  useLanguageRedirect('/');
  return <LoadingSpinner />;
}
