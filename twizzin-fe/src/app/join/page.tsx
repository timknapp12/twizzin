'use client';
import { useLanguageRedirect, LoadingSpinner } from '@/utils/languageRedirect';

export default function JoinRedirectPage() {
  useLanguageRedirect('/join');
  return <LoadingSpinner />;
}
