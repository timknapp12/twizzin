'use client';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import { ErrorBoundary, MainSkeleton } from '@/components';
import dynamic from 'next/dynamic';
import { ProgramContextProvider, AppContextProvider } from '@/contexts';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@getpara/react-sdk/styles.css';
import { Environment } from '@getpara/react-sdk';

const ParaProvider = dynamic(
  () => import('@getpara/react-sdk').then((mod) => mod.ParaProvider),
  { ssr: false }
);

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
  const [queryClient] = React.useState(() => new QueryClient());

  React.useEffect(() => {
    if (lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang]);

  return (
    <QueryClientProvider client={queryClient}>
      <ParaProvider
        paraClientConfig={{
          apiKey: process.env.NEXT_PUBLIC_PARA_API_KEY || '',
          env: Environment.BETA,
        }}
      >
        <I18nextProvider i18n={i18n} defaultNS='common'>
          <WalletProviders>
            <ProgramContextProvider>
              <AppContextProvider>
                <ErrorBoundary>
                  {children}
                  <ToastContainer position='top-right' />
                </ErrorBoundary>
              </AppContextProvider>
            </ProgramContextProvider>
          </WalletProviders>
        </I18nextProvider>
      </ParaProvider>
    </QueryClientProvider>
  );
}
