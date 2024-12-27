'use client';
import { useState, useEffect } from 'react';
import {
  Column,
  InnerScreenContainer,
  Row,
  ScreenContainer,
} from '../containers';
import { Input } from '../inputs';
import { Button } from '../buttons/Button';
import { PrimaryText } from '../texts';
import { useProgram } from '@/contexts/ProgramContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { initializeConfig } from '@/utils/program/initConfig';
import { useAppContext } from '@/contexts';
import { Header } from '../Header';

export const AdminComponent = () => {
  const { t } = useAppContext();
  const { program, isWalletConnected } = useProgram();
  const wallet = useWallet();

  const [treasuryAddress, setTreasuryAddress] = useState('');
  const [treasuryFee, setTreasuryFee] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [status, setStatus] = useState<{
    loading: boolean;
    error: string | null;
    signature: string | null;
  }>({
    loading: false,
    error: null,
    signature: null,
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleInitConfig = async () => {
    if (!program || !isWalletConnected) {
      setStatus((prev) => ({
        ...prev,
        error: t('Please connect your wallet'),
      }));
      return;
    }

    setStatus({ loading: true, error: null, signature: null });

    try {
      const response = await initializeConfig(
        program,
        wallet,
        treasuryAddress,
        treasuryFee
      );

      if (!response.success) {
        throw new Error(response.error || t('Failed to initialize config'));
      }

      setStatus({
        loading: false,
        error: null,
        signature: response.signature,
      });

      // Clear form on success
      setTreasuryAddress('');
      setTreasuryFee('');
    } catch (error) {
      setStatus({
        loading: false,
        error: error instanceof Error ? error.message : t('An error occurred'),
        signature: null,
      });
    }
  };

  if (!isClient) {
    return null;
  }

  return (
    <ScreenContainer>
      <Header />
      <InnerScreenContainer justify='start' className='mt-[7vh]'>
        <PrimaryText>{t('Initialize Program Config')}</PrimaryText>

        {!isWalletConnected ? (
          <Column className='items-center gap-4'>
            <p className='text-amber-600'>
              {t('Please connect your wallet first')}
            </p>
            <WalletMultiButton />
          </Column>
        ) : (
          <>
            <Row className='w-full gap-4'>
              <Input
                className='flex-grow'
                type='text'
                id='treasuryAddress'
                name='treasuryAddress'
                placeholder={t('Enter treasury address')}
                value={treasuryAddress}
                onChange={(e) => setTreasuryAddress(e.target.value)}
                aria-label='Treasury Address'
                required
                disabled={status.loading}
              />
              <Input
                className='flex-grow'
                type='number'
                id='treasuryFee'
                name='treasuryFee'
                placeholder={t('Enter treasury fee (0-10)')}
                value={treasuryFee}
                onChange={(e) => setTreasuryFee(e.target.value)}
                aria-label='Treasury Fee'
                required
                min='0'
                max='10'
                step='0.1'
                disabled={status.loading}
              />
            </Row>
            <Column className='w-1/2'>
              <Button
                onClick={handleInitConfig}
                disabled={status.loading || !treasuryAddress || !treasuryFee}
              >
                {status.loading ? t('Initializing...') : t('Initialize Config')}
              </Button>
            </Column>
          </>
        )}

        {status.error && (
          <div className='p-4 bg-red-100 border border-red-400 rounded text-red-700'>
            {status.error}
          </div>
        )}

        {status.signature && (
          <div className='p-4 bg-green-100 border border-green-400 rounded'>
            <p className='text-green-700'>
              {t('Config initialized successfully!')}
            </p>
            <a
              href={`https://explorer.solana.com/tx/${status.signature}${
                process.env.NEXT_PUBLIC_ENVIRONMENT === 'devnet'
                  ? '?cluster=devnet'
                  : ''
              }`}
              target='_blank'
              rel='noopener noreferrer'
              className='text-sm text-blue-500 hover:underline'
            >
              {t('View transaction')}
            </a>
          </div>
        )}
      </InnerScreenContainer>
    </ScreenContainer>
  );
};
