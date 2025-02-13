'use client';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import { ErrorBoundary, MainSkeleton } from '@/components';
import dynamic from 'next/dynamic';
import { ProgramContextProvider, AppContextProvider } from '@/contexts';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const WalletProviders = dynamic(
  () =>
    import('@/contexts/WalletContext').then((mod) => mod.WalletContextProvider),
  {
    ssr: false,
    loading: () => <MainSkeleton />,
  }
);

type LayoutClientProps = {
  children: React.ReactNode;
  lang: string;
};

export default function LayoutClient({ children, lang }: LayoutClientProps) {
  React.useEffect(() => {
    if (lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang]);

  return (
    <I18nextProvider i18n={i18n} defaultNS='common'>
      <WalletProviders>
        <ProgramContextProvider>
          <AppContextProvider>
            <ErrorBoundary>
              {children}
              <ToastContainer />
            </ErrorBoundary>
          </AppContextProvider>
        </ProgramContextProvider>
      </WalletProviders>
    </I18nextProvider>
  );
}
