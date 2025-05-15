import { useWalletContext } from '@/contexts';
import { useCallback } from 'react';

export const useVerification = () => {
  const { isVerified } = useWalletContext();
  
  const withVerification = useCallback(async <T>(
    operation: () => Promise<T>,
    errorMessage: string = 'Wallet verification required',
    forceVerified: boolean = false
  ): Promise<T | null> => {
    if (!isVerified && !forceVerified) {
      console.warn(errorMessage);
      return null;
    }
    
    return operation();
  }, [isVerified]);
  
  return {
    isVerified,
    withVerification
  };
}; 