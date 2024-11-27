'use client';
import React, { useEffect, useMemo } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import dynamic from 'next/dynamic';
import { clusterApiUrl, Commitment } from '@solana/web3.js';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { ErrorBoundary } from '@/components';
import { ProgramContextProvider } from '@/contexts/ProgramContext';

// Update the type definition
interface LayoutProps {
  children: React.ReactNode;
  params: {
    lang: string;
  };
}

const ConnectionProvider = dynamic(
  () =>
    import('@solana/wallet-adapter-react').then(
      (mod) => mod.ConnectionProvider
    ),
  { ssr: false }
);

const WalletProvider = dynamic(
  () =>
    import('@solana/wallet-adapter-react').then((mod) => mod.WalletProvider),
  { ssr: false }
);

const WalletModalProvider = dynamic(
  () =>
    import('@solana/wallet-adapter-react-ui').then(
      (mod) => mod.WalletModalProvider
    ),
  { ssr: false }
);

export default function Layout({ children, params }: LayoutProps) {
  useEffect(() => {
    i18n.changeLanguage(params.lang);
  }, [params.lang]);

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
