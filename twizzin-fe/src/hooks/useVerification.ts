import { useWalletContext } from '@/contexts';
import { useCallback } from 'react';

export class VerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VerificationError';
  }
}

export interface Result<T> {
  success: boolean;
  data: T | null;
  error: Error | null;
}

export const useVerification = () => {
  const { isVerified, refreshSession } = useWalletContext();
  
  const withVerification = useCallback(async <T>(
    operation: () => Promise<T>,
    errorMessage: string = 'Wallet verification required',
    forceVerified: boolean = false
  ): Promise<T | null> => {
    try {
      if (!isVerified && !forceVerified) {
        console.warn(errorMessage);
        return null;
      }
      
      const result = await operation();
      return result;
    } catch (error) {
      if (error instanceof VerificationError) {
        await refreshSession();
      }
      return null;
    }
  }, [isVerified, refreshSession]);
  
  return {
    isVerified,
    withVerification
  };
}; 