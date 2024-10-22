'use client';
import { useLanguageRedirect, LoadingSpinner } from '@/utils/languageRedirect';

export default function CreateRedirectPage() {
  useLanguageRedirect('/create');
  return <LoadingSpinner />;
}
