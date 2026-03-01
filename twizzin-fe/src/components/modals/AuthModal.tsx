'use client';
import React from 'react';
import { Button } from '@/components';
import { FaSpinner } from 'react-icons/fa';
import { useAppContext } from '@/contexts/AppContext';

interface AuthModalProps {
  isOpen: boolean;
  loading: boolean;
  error?: string | null;
  onAuthenticate: () => void;
  onClose: () => void;
  className?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  loading,
  error,
  onAuthenticate,
  onClose,
  className,
}) => {
  const { t } = useAppContext();

  if (!isOpen) return null;

  return (
    <div className={`modal ${className || ''}`}>
      <div
        className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center'
        onClick={onClose}
      >
        <div
          className='bg-surface p-6 rounded-lg w-full max-w-md h-auto max-h-[600px] flex flex-col items-center font-sans shadow-lg'
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className='text-2xl font-semibold mb-4 text-center'>
            {t('Verify Your Wallet')}
          </h2>
          <p className='mb-4 text-center text-base'>
            {t(
              'Sign a message to verify wallet ownership. This creates a secure session for accessing protected features.'
            )}
          </p>
          {error && (
            <div className='text-red-500 mb-2 text-center'>{t(error)}</div>
          )}
          <div className='flex gap-4 mt-2'>
            <Button
              onClick={onAuthenticate}
              disabled={loading}
              className='text-base py-2 px-6'
            >
              {loading ? (
                <FaSpinner className='animate-spin' size={20} />
              ) : (
                t('Verify')
              )}
            </Button>
            <Button
              secondary
              onClick={onClose}
              disabled={loading}
              className='text-base py-2 px-6'
            >
              {t('Dismiss')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
