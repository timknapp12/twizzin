'use client';
import { useLanguageRedirect, LoadingSpinner } from '@/utils/languageRedirect';

export default function AdminRedirectPage() {
  useLanguageRedirect('/admin');
  return <LoadingSpinner />;
}
