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
  refreshSession: () => Promise<void>;
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
  const SESSION_REFRESH_INTERVAL = 1000 * 60 * 30; // 30 minutes

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

  const refreshSession = useCallback(async () => {
    if (!publicKey || !sessionToken) return;

    try {
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .single();

      if (sessionError || !session) {
        throw new Error('Session not found');
      }

      const now = new Date();
      const expiresAt = new Date(session.expires_at);
      
      if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
        const newSessionToken = await createSession(publicKey.toString());
        setSessionToken(newSessionToken);
      }
    } catch (error) {
      console.error('Failed to refresh session:', error);
      setIsVerified(false);
      setSessionToken(null);
    }
  }, [publicKey, sessionToken]);

  useEffect(() => {
    if (!isVerified || !sessionToken) return;

    const intervalId = setInterval(refreshSession, SESSION_REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [isVerified, sessionToken, refreshSession]);

  const handleError = useCallback((error: unknown, context: string) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error in ${context}:`, error);
    setError(`${context}: ${errorMessage}`);
    
    if (errorMessage.includes('Invalid signature') || 
        errorMessage.includes('Session not found')) {
      setIsVerified(false);
      setSessionToken(null);
    }
  }, []);

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
        setIsLoading(true);
        setError(null);

        timeoutId = setTimeout(() => {
          handleError(new Error('Verification timeout'), 'Verification');
          setIsLoading(false);
        }, VERIFICATION_TIMEOUT);

        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const { ip } = await ipResponse.json();

        const isRateLimited = await checkIPRateLimit(ip);
        if (!isRateLimited) {
          throw new Error('Too many verification attempts. Please try again later.');
        }

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
            await supabase.from('suspicious_activities').insert({
              wallet_address: publicKey.toString(),
              activity_type: 'suspicious_location',
              details: geolocation,
              ip_address: ip
            });
          }
        }

        const nonce = generateNonce();
        const message = generateVerificationMessage(publicKey.toString(), nonce);
        const encodedMessage = new TextEncoder().encode(message);
        const signature = await signMessage?.(encodedMessage);
        
        if (!signature) {
          throw new Error('Failed to get signature');
        }

        const isValid = await verifySignature(message, signature, publicKey.toString());
        if (!isValid) {
          throw new Error('Invalid signature');
        }

        await supabase.from('wallet_verifications').insert({
          wallet_address: publicKey.toString(),
          nonce,
          signature: Buffer.from(signature).toString('base64'),
          verified_at: new Date().toISOString(),
          ip_address: ip,
          geolocation,
          device_fingerprint: getDeviceFingerprint(),
        });

        const newSessionToken = await createSession(publicKey.toString());
        setSessionToken(newSessionToken);
        setIsVerified(true);

        if (attemptId) {
          await supabase.from('verification_attempts').update({ success: true }).eq('id', attemptId);
        }

        const player = await ensurePlayerExists(
          publicKey.toBase58(),
          withVerification,
          undefined,
          true
        );
        
        if (!player) {
          throw new Error('Failed to create player');
        }

        clearTimeout(timeoutId);
      } catch (error) {
        handleError(error, 'Verification');
        setVerificationAttempts(prev => prev + 1);
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    };

    if (publicKey && !isVerified) {
      verifyAndCreatePlayer();
    }

    return () => {
      isMounted = false;
    };
  }, [
    publicKey,
    isVerified,
    verificationAttempts,
    MAX_ATTEMPTS,
    VERIFICATION_TIMEOUT,
    signMessage,
    withVerification,
    handleError
  ]);

  const generateNonce = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  const generateVerificationMessage = (walletAddress: string, nonce: string) => {
    const timestamp = new Date().toISOString();
    return `Verify wallet ownership for Twizzin:\nWallet: ${walletAddress}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
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
        refreshSession
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
