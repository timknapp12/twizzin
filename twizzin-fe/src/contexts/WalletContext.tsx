'use client';
import { FC, PropsWithChildren, useMemo, useEffect, useState } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { Commitment } from '@solana/web3.js';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { ProgramContextProvider } from '@/contexts/ProgramContext';
import '@solana/wallet-adapter-react-ui/styles.css';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

const originalConsoleWarn = console.warn;
console.warn = function filterWarnings(msg, ...args) {
  if (msg.includes('registered as a Standard Wallet')) {
    return;
  }
  originalConsoleWarn.apply(console, [msg, ...args]);
};

export const WalletContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT;
  const isDevnet = environment === 'devnet';

  // Use the /api/rpc proxy so the Helius API key stays server-side.
  const endpoint = useMemo(() => {
    return '/api/rpc';
  }, []);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter({
        network: isDevnet
          ? WalletAdapterNetwork.Devnet
          : WalletAdapterNetwork.Mainnet,
      }),
      new SolflareWalletAdapter({
        network: isDevnet
          ? WalletAdapterNetwork.Devnet
          : WalletAdapterNetwork.Mainnet,
      }),
    ],
    [isDevnet],
  );

  const connectionConfig = useMemo(() => {
    const config: { commitment: Commitment; wsEndpoint?: string } = {
      commitment: 'confirmed' as Commitment,
    };
    // The /api/rpc proxy only handles HTTP POSTs, not WebSocket connections.
    // Only set wsEndpoint when using a direct Helius/RPC URL.
    if (endpoint.startsWith('https')) {
      config.wsEndpoint = endpoint.replace('https', 'wss');
    }
    return config;
  }, [endpoint]);

  if (!mounted) {
    return null;
  }

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
