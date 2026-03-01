'use client';

import { useSupabaseAuth, useAppContext } from '@/contexts';
import { H6 } from '@/components/texts';
import { useWallet } from '@solana/wallet-adapter-react';

const AuthBanner: React.FC = () => {
  const { t, authModalDismissed, signInWithSupabase } = useAppContext();
  const { supabaseUser } = useSupabaseAuth();
  const { connected } = useWallet();

  if (!connected || !authModalDismissed || supabaseUser) return null;

  return (
    <div
      className='w-full px-4 py-1 flex items-center justify-center bg-orange cursor-pointer rounded-lg'
      onClick={signInWithSupabase}
    >
      <H6 className='text-center'>
        {t('Please confirm your wallet before creating or joining a game.')}
      </H6>
    </div>
  );
};

export default AuthBanner;
