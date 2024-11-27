'use client';
import React, { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { ProgramContextProvider } from '@/contexts/ProgramContextProvider';
import { useMemo } from 'react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { ErrorBoundary } from '@/components';
require('@solana/wallet-adapter-react-ui/styles.css');

export default function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = React.use(params);

  useEffect(() => {
    i18n.changeLanguage(lang);
  }, [lang]);

  const endpoint = useMemo(
    () =>
      process.env.NEXT_PUBLIC_RPC_URL ||
      clusterApiUrl(
        process.env.NEXT_PUBLIC_ENVIRONMENT === 'devnet'
          ? 'devnet'
          : 'mainnet-beta'
      ),
    []
  );

  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n} defaultNS='common'>
        <ConnectionProvider endpoint={endpoint}>
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
              <ProgramContextProvider>{children}</ProgramContextProvider>
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </I18nextProvider>
    </ErrorBoundary>
  );
}
