'use client';
import React, { useEffect, useMemo } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl, Commitment } from '@solana/web3.js';
import { ProgramContextProvider } from '@/contexts/ProgramContext';
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

  // Add environment check for better debugging
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT;
  const isDevnet = environment === 'devnet';

  const endpoint = useMemo(
    () =>
      process.env.NEXT_PUBLIC_RPC_URL ||
      clusterApiUrl(isDevnet ? 'devnet' : 'mainnet-beta'),
    [isDevnet]
  );

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter({
        network: isDevnet ? 'devnet' : 'mainnet-beta',
      }),
    ],
    [isDevnet]
  );

  // Optional: Add connection config for better reliability
  const connectionConfig = useMemo(
    () => ({
      commitment: 'confirmed' as Commitment,
      wsEndpoint: endpoint.replace('https', 'wss'),
    }),
    [endpoint]
  );

  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n} defaultNS='common'>
        <ConnectionProvider endpoint={endpoint} config={connectionConfig}>
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
