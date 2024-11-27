'use client';
import { FC, PropsWithChildren, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl, Commitment } from '@solana/web3.js';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { ProgramContextProvider } from '@/contexts/ProgramContext';

const WalletProviders: FC<PropsWithChildren> = ({ children }) => {
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
    <ConnectionProvider endpoint={endpoint} config={connectionConfig}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <ProgramContextProvider>{children}</ProgramContextProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

// Export with dynamic import to prevent SSR
export default dynamic(() => Promise.resolve(WalletProviders), {
  ssr: false,
});
