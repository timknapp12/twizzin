'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert } from './Alert';
import { Button } from './buttons/Button';
import { useAppContext } from '@/contexts/AppContext';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  isWalletError?: boolean;
}

const ErrorContent = ({
  error,
  onReset,
}: {
  error: Error | undefined;
  onReset: () => void;
}) => {
  const { t } = useAppContext();

  return (
    <Alert
      variant='error'
      className='max-w-lg'
      title={t('Something went wrong!')}
      description={
        <div>
          <div className='mb-4'>
            {process.env.NODE_ENV === 'development' && error ? (
              <pre className='text-sm overflow-auto'>{error.message}</pre>
            ) : (
              t('An error occurred while rendering this page.')
            )}
          </div>
          <Button onClick={onReset} className='mt-2'>
            {t('Try again')}
          </Button>
        </div>
      }
    />
  );
};

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    const isWalletError =
      error.message.includes('Invalid public key input') ||
      error.message.includes('wallet adapter') ||
      error.message.includes('PublicKey');

    return {
      hasError: true,
      error,
      isWalletError,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (!(typeof window === 'undefined' && this.state.isWalletError)) {
      console.error('Uncaught error:', error, errorInfo);
    }
  }

  public render() {
    if (this.state.hasError) {
      if (typeof window === 'undefined' && this.state.isWalletError) {
        return null;
      }

      return (
        <div className='flex items-center justify-center min-h-screen p-4'>
          <ErrorContent
            error={this.state.error}
            onReset={() =>
              this.setState({
                hasError: false,
                error: undefined,
                isWalletError: false,
              })
            }
          />
        </div>
      );
    }

    return this.props.children;
  }
}
