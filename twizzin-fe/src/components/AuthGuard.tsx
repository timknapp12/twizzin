'use client';

import React, { ReactNode, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Column } from '@/components/containers';
import { useAppContext } from '@/contexts/AppContext';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { AuthModal } from '@/components/modals/AuthModal';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean; // If false, only requires wallet connection
  fallbackMessage?: string;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAuth = true,
  fallbackMessage,
}) => {
  const { connected } = useWallet();
  const {
    t,
    showAuthModal,
    setShowAuthModal,
    signInWithSupabase,
    setAuthGuardActive,
  } = useAppContext();
  const { loading, error, supabaseUser } = useSupabaseAuth();

  // Tell AppContext that an AuthGuard is active on this page so the global
  // AuthModal in AppContext does not render on top of the guard's own modal.
  useEffect(() => {
    if (requireAuth) {
      setAuthGuardActive(true);
      return () => setAuthGuardActive(false);
    }
  }, [requireAuth, setAuthGuardActive]);

  // Step 1: Check wallet connection
  if (!connected) {
    return (
      <Column className='items-center gap-4 flex-1 justify-center'>
        <p className='text-amber-600 text-center'>
          {fallbackMessage || t('Please connect your wallet first')}
        </p>
        <WalletMultiButton />
      </Column>
    );
  }

  // Step 2: Check authentication (if required)
  if (requireAuth && !supabaseUser) {
    // When auth is required, the user MUST authenticate — no "Skip for now".
    // authModalDismissed is intentionally ignored here so the guard always blocks.
    return (
      <>
        <Column className='items-center gap-4 flex-1 justify-center'>
          <p className='text-amber-600 text-center'>
            {t('Please verify your wallet to continue')}
          </p>
          <button
            onClick={() => setShowAuthModal(true)}
            className='bg-primaryText text-background hover:bg-background hover:text-primaryText px-6 py-3 rounded-full border border-primaryText transition-colors duration-200'
          >
            {t('Verify Wallet')}
          </button>
        </Column>
        <AuthModal
          isOpen={showAuthModal && !supabaseUser}
          loading={loading}
          error={error}
          onAuthenticate={signInWithSupabase}
          onClose={() => {
            // Only close the modal UI — do NOT dismiss the guard.
            // The user stays on the guard screen and can click "Verify Wallet" again.
            setShowAuthModal(false);
          }}
        />
      </>
    );
  }

  // If we reach here, user is properly authenticated (or auth not required)
  return <>{children}</>;
};

// Convenience components for different auth levels
export const WalletGuard: React.FC<{
  children: ReactNode;
  fallbackMessage?: string;
}> = ({ children, fallbackMessage }) => (
  <AuthGuard requireAuth={false} fallbackMessage={fallbackMessage}>
    {children}
  </AuthGuard>
);

export const FullAuthGuard: React.FC<{
  children: ReactNode;
  fallbackMessage?: string;
}> = ({ children, fallbackMessage }) => (
  <AuthGuard requireAuth={true} fallbackMessage={fallbackMessage}>
    {children}
  </AuthGuard>
);
