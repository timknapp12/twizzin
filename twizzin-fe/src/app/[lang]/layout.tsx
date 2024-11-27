'use client';
import React, { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import { ErrorBoundary } from '@/components';
import dynamic from 'next/dynamic';

const WalletProviders = dynamic(() => import('@/components/WalletProviders'), {
  ssr: false,
  loading: () => <div>Loading wallet...</div>,
});

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    lang: string;
  }>;
};

export default function Layout({ children, params }: LayoutProps) {
  const resolvedParams = React.use(params);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (resolvedParams.lang) {
      i18n.changeLanguage(resolvedParams.lang);
    }
  }, [resolvedParams.lang]);

  if (!isMounted) {
    return null;
  }

  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n} defaultNS='common'>
        <WalletProviders>{children}</WalletProviders>
      </I18nextProvider>
    </ErrorBoundary>
  );
}
