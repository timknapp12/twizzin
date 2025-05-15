'use client';
import { FC, PropsWithChildren, useMemo, useEffect, useState, createContext, useContext, useCallback } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl, Commitment } from '@solana/web3.js';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { ProgramContextProvider } from '@/contexts/ProgramContext';
import '@solana/wallet-adapter-react-ui/styles.css';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ensurePlayerExists } from '@/utils/supabase/playerManagement';
import { supabase } from '@/utils/supabase/supabaseClient';
import {
  checkIPRateLimit,
  getGeolocationData,
  checkSuspiciousLocation,
  createSession,
  verifySignature,
  getDeviceFingerprint,
} from '@/utils/security/verification';

const originalConsoleWarn = console.warn;
console.warn = function filterWarnings(msg, ...args) {
  if (msg.includes('registered as a Standard Wallet')) {
    return;
  }
  originalConsoleWarn.apply(console, [msg, ...args]);
};

interface WalletContextType {
  isVerified: boolean;
  sessionToken: string | null;
  isLoading: boolean;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within a WalletContextProvider');
  }
  return context;
};

const WalletConnectionHandler: FC<{ children: React.ReactNode }> = ({ children }) => {
  const { publicKey, signMessage } = useWallet();
  const [isVerified, setIsVerified] = useState(false);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const MAX_ATTEMPTS = 10;
  const VERIFICATION_TIMEOUT = 30000;

  const withVerification = useCallback(function withVerification<T>(
    operation: () => Promise<T>,
    errorMessage: string = 'Wallet verification required',
    forceVerified: boolean = false
  ): Promise<T | null> {
    if (!isVerified && !forceVerified) {
      console.warn(errorMessage);
      return Promise.resolve(null);
    }
    return operation();
  }, [isVerified]);

  useEffect(() => {
    setIsVerified(false);
    setVerificationAttempts(0);
    setSessionToken(null);
    setError(null);
    setIsLoading(false);
  }, [publicKey]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;

    const verifyAndCreatePlayer = async () => {
      if (!publicKey) return;

      try {
        timeoutId = setTimeout(() => {
          if (isMounted) {
            setError('Verification timeout');
            setIsLoading(false);
          }
          throw new Error('Verification timeout');
        }, VERIFICATION_TIMEOUT);

        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const { ip } = await ipResponse.json();

        const { data: attemptData, error: attemptError } = await supabase
          .from('verification_attempts')
          .insert({
            ip_address: ip,
            attempt_time: new Date().toISOString(),
            wallet_address: publicKey.toString(),
            success: false
          })
          .select()
          .single();
        
        if (attemptError) {
          throw attemptError;
        }
        const attemptId = attemptData?.id;

        const isRateLimited = await checkIPRateLimit(ip);
        if (!isRateLimited) {
          throw new Error('Too many verification attempts. Please try again later.');
        }

        const recentlyVerified = await checkRecentVerification(publicKey.toString());
        if (recentlyVerified) {
          setIsVerified(true);
          if (attemptId) {
            await supabase.from('verification_attempts').update({ success: true }).eq('id', attemptId);
          }
          return;
        }

        const geolocation = await getGeolocationData(ip);
        if (geolocation) {
          const isSuspicious = await checkSuspiciousLocation(publicKey.toString(), geolocation);
          if (isSuspicious) {
            console.warn('Suspicious location change detected:', geolocation);
          }
        }

        const nonce = generateNonce();
        const timestamp = new Date().toISOString();
        const message = `Verify wallet ownership for Twizzin:\nWallet: ${publicKey.toString()}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
        
        const encodedMessage = new TextEncoder().encode(message);
        const signature = await signMessage?.(encodedMessage);
        
        if (signature) {
          const isValid = await verifySignature(message, signature, publicKey.toString());
          if (!isValid) {
            throw new Error('Invalid signature');
          }

          setIsVerified(true);
          await new Promise(resolve => setTimeout(resolve, 0));

          try {
            const { error: storeError } = await supabase
              .from('wallet_verifications')
              .insert({
                wallet_address: publicKey.toString(),
                nonce,
                signature: Buffer.from(signature).toString('base64'),
                verified_at: new Date().toISOString(),
                ip_address: await fetch('https://api.ipify.org?format=json').then(r => r.json()).then(data => data.ip),
                geolocation,
                device_fingerprint: getDeviceFingerprint(),
              });

            if (storeError) {
              throw storeError;
            }
          } catch (error) {
            throw error;
          }
          
          try {
            const newSessionToken = await createSession(publicKey.toString());
            setSessionToken(newSessionToken);
          } catch (error) {
            throw error;
          }
          
          try {
            const player = await ensurePlayerExists(
              publicKey.toBase58(),
              withVerification,
              undefined,
              true
            );
            if (!player) {
              throw new Error('Failed to create player');
            }
          } catch (error) {
            throw error;
          }
          
          let retries = 0;
          const maxRetries = 5;
          while (retries < maxRetries) {
            try {
              const { data: playerData, error: playerError } = await supabase
                .from('players')
                .select('*')
                .eq('wallet_address', publicKey.toBase58())
                .single();
              
              if (playerData) {
                break;
              }
              
              await new Promise(resolve => setTimeout(resolve, 1000));
              retries++;
            } catch (error) {
              retries++;
            }
          }

          if (retries === maxRetries) {
            throw new Error('Player creation verification failed');
          }

          try {
            await supabase
              .from('verification_attempts')
              .update({ success: true })
              .eq('id', attemptId);
          } catch (error) {
            // Ignore error updating attempt status
          }

          return true;
        }
      } catch (error) {
        if (isMounted) {
          setError(error instanceof Error ? error.message : 'Verification failed');
          setVerificationAttempts(prev => prev + 1);
        }
      } finally {
        if (isMounted) {
          clearTimeout(timeoutId);
          setIsLoading(false);
        }
      }
    };

    if (publicKey && !isVerified) {
      verifyAndCreatePlayer();
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [
    publicKey,
    isVerified,
    verificationAttempts,
    MAX_ATTEMPTS,
    VERIFICATION_TIMEOUT,
    signMessage,
    withVerification
  ]);

  const generateNonce = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  const checkRecentVerification = async (walletAddress: string) => {
    try {
      const { data, error } = await supabase
        .from('wallet_verifications')
        .select('verified_at, session_token')
        .eq('wallet_address', walletAddress)
        .order('verified_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const lastVerified = new Date(data.verified_at);
        const now = new Date();
        if ((now.getTime() - lastVerified.getTime()) < 24 * 60 * 60 * 1000) {
          setSessionToken(data.session_token);
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  };

  return (
    <WalletContext.Provider
      value={{
        isVerified,
        sessionToken,
        isLoading,
        error,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const WalletContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      try {
        setMounted(true);
      } catch (error) {
        // Ignore initialization error
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
  }, []);

  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT;
  const isDevnet = environment === 'devnet';

  const endpoint = useMemo(() => {
    if (process.env.NEXT_PUBLIC_HELIUS_API_KEY) {
      return `https://${
        isDevnet ? 'devnet' : 'mainnet'
      }.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`;
    }
    return (
      process.env.NEXT_PUBLIC_RPC_URL ||
      clusterApiUrl(isDevnet ? 'devnet' : 'mainnet-beta')
    );
  }, [isDevnet]);

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
    [isDevnet]
  );

  const connectionConfig = useMemo(
    () => ({
      commitment: 'confirmed' as Commitment,
      wsEndpoint: endpoint.replace('https', 'wss'),
    }),
    [endpoint]
  );

  if (!mounted || isInitializing) {
    return null;
  }

  return (
    <ConnectionProvider endpoint={endpoint} config={connectionConfig}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletConnectionHandler>
            <ProgramContextProvider>{children}</ProgramContextProvider>
          </WalletConnectionHandler>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
