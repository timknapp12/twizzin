'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert } from './Alert';
import { Button } from './buttons/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  isWalletError?: boolean;
}

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
          <Alert
            variant='error'
            className='max-w-lg'
            title='Something went wrong!'
            description={
              <div>
                <div className='mb-4'>
                  {process.env.NODE_ENV === 'development' &&
                  this.state.error ? (
                    <pre className='text-sm overflow-auto'>
                      {this.state.error.message}
                    </pre>
                  ) : (
                    'An error occurred while rendering this page.'
                  )}
                </div>
                <Button
                  onClick={() =>
                    this.setState({
                      hasError: false,
                      error: undefined,
                      isWalletError: false,
                    })
                  }
                  className='mt-2'
                >
                  Try again
                </Button>
              </div>
            }
          />
        </div>
      );
    }

    return this.props.children;
  }
}
