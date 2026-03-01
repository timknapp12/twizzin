'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/utils/supabase/supabaseClient';

// Define the context type
interface SupabaseAuthContextType {
  supabaseUser: any;
  supabaseSession: any;
  loading: boolean;
  error: string | null;
  signInWithSupabase: () => Promise<void>;
  // eslint-disable-next-line no-unused-vars
  signOut: (isCancel?: boolean) => Promise<void>;
}

// Provide a default value for the context
const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(
  undefined
);

interface SupabaseAuthProviderProps {
  children: ReactNode;
}

export const SupabaseAuthProvider: React.FC<SupabaseAuthProviderProps> = ({
  children,
}) => {
  const { wallet, publicKey, signMessage } = useWallet();
  const [loading, setLoading] = useState(false);
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [supabaseSession, setSupabaseSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSupabaseSession(session);
        setSupabaseUser(session?.user ?? null);
      }
    );

    // Initial load
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSupabaseSession(data.session);
      setSupabaseUser(data.session?.user ?? null);
    })();

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Invalidate session if wallet changes or disconnects
  useEffect(() => {
    const checkWalletSessionMatch = async () => {
      if (!supabaseUser || !supabaseSession) return;

      const sessionWallet =
        supabaseUser.user_metadata?.custom_claims?.address ||
        supabaseUser.user_metadata?.wallet_address ||
        supabaseUser.app_metadata?.wallet_address;
      const currentWallet = publicKey?.toBase58();

      // Only check if we have a current wallet (don't sign out during wallet initialization)
      if (currentWallet && sessionWallet && sessionWallet !== currentWallet) {
        console.log('Wallet mismatch detected, signing out');
        await signOut();
      }
      // If wallet is disconnected but we have a session, sign out
      else if (!currentWallet && sessionWallet) {
        console.log('Wallet disconnected, signing out');
        await signOut();
      }
    };

    // Add a small delay to allow wallet to initialize after page refresh
    const timeoutId = setTimeout(checkWalletSessionMatch, 100);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, supabaseUser, supabaseSession]);

  const signInWithSupabase = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!wallet || !publicKey || !signMessage) return;
      const adapterHasSignMessage =
        wallet.adapter &&
        'signMessage' in wallet.adapter &&
        typeof (wallet.adapter as any).signMessage === 'function';
      if (!adapterHasSignMessage) {
        setError(
          'This wallet does not support message signing required for authentication. Please use Phantom or Solflare.'
        );
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signInWithWeb3({
        chain: 'solana',
        wallet: wallet.adapter as any,
        statement: 'Sign in to Twizzin',
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setSupabaseSession(data.session);
      setSupabaseUser(data.user);
      setLoading(false);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      setLoading(false);
    }
  }, [wallet, publicKey, signMessage]);

  // signOut can be called as a cancel (set hasCancelled) or normal sign out (reset flag)
  const signOut = useCallback(async () => {
    setLoading(false);
    await supabase.auth.signOut();
    setSupabaseSession(null);
    setSupabaseUser(null);
  }, []);

  return (
    <SupabaseAuthContext.Provider
      value={{
        supabaseUser,
        supabaseSession,
        loading,
        error,
        signInWithSupabase,
        signOut,
      }}
    >
      {children}
    </SupabaseAuthContext.Provider>
  );
};

export const useSupabaseAuth = () => {
  const context = useContext(SupabaseAuthContext);
  if (context === undefined) {
    throw new Error(
      'useSupabaseAuth must be used within a SupabaseAuthProvider'
    );
  }
  return context;
};
