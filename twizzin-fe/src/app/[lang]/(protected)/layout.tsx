'use client';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from '@/components';

const WalletProviders = dynamic(() => import('@/components/WalletProviders'), {
  ssr: false,
  loading: () => <div>Loading wallet...</div>,
});

type LayoutProps = {
  children: React.ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <ErrorBoundary>
      <WalletProviders>{children}</WalletProviders>
    </ErrorBoundary>
  );
}
