'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { FaSpinner } from 'react-icons/fa';

export const LoadingSpinner = () => (
  <div className='flex items-center justify-center min-h-screen'>
    <FaSpinner className='animate-spin text-4xl' />
  </div>
);

// Custom hook for language redirection
export const useLanguageRedirect = (path: string) => {
  const router = useRouter();
  const { language } = useAppContext();

  useEffect(() => {
    router.replace(`/${language}${path}`);
  }, [language, router, path]);
};
