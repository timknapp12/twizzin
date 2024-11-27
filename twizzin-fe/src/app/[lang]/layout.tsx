'use client';
import React, { useEffect, Suspense } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from '@/components';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    lang: string;
  }>;
};

const SolanaProviders = dynamic(() => import('@/components/SolanaProviders'), {
  ssr: false,
  loading: () => <div>Loading wallet...</div>,
});

export default function Layout({ children, params }: LayoutProps) {
  const resolvedParams = React.use(params);

  useEffect(() => {
    if (resolvedParams.lang) {
      i18n.changeLanguage(resolvedParams.lang);
    }
  }, [resolvedParams.lang]);

  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n} defaultNS='common'>
        <Suspense fallback={<div>Loading...</div>}>
          <SolanaProviders>{children}</SolanaProviders>
        </Suspense>
      </I18nextProvider>
    </ErrorBoundary>
  );
}
