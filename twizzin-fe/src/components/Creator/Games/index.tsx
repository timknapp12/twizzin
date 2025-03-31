'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ScreenContainer,
  InnerScreenContainer,
  Button,
  Column,
  Row,
  Card,
  H3,
  PrimaryText,
  Grid,
  Label,
  Header,
} from '@/components';
import { FaSpinner } from 'react-icons/fa6';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAppContext } from '@/contexts';
import { supabase } from '@/utils';

interface Game {
  id: string;
  game_code: string;
  name: string;
  created_at: string;
  status: string;
  image_url: string;
  entry_fee: number;
  token_mint: string;
  admin_wallet: string;
}

export const CreatorGamesComponent = () => {
  const router = useRouter();
  const { publicKey } = useWallet();
  const { t } = useAppContext();

  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchCreatorGames = async () => {
      if (!publicKey) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const { data, error } = await supabase
          .from('games')
          .select(
            'id, game_code, name, created_at, status, image_url, entry_fee, token_mint, admin_wallet'
          )
          .eq('admin_wallet', publicKey.toBase58())
          .order('created_at', { ascending: false });

        if (error) throw error;

        setGames(data || []);
      } catch (err) {
        console.error('Error fetching creator games:', err);
        setError(
          err instanceof Error ? err.message : t('Failed to load games')
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchCreatorGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey]);

  const handleCreateNewGame = () => {
    router.push('/create');
  };

  const handleViewGame = (gameCode: string) => {
    router.push(`/creator/game/${gameCode}`);
  };

  // Function to format the entry fee with correct denomination
  const formatEntryFee = (entryFee: number, isNative = true) => {
    const fee = entryFee / 1000000000; // Convert from lamports to SOL
    return `${fee} ${isNative ? 'SOL' : 'Token'}`;
  };

  // Function to format the date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Get status label with color
  const getStatusLabel = (status: string) => {
    const statusMap = {
      pending: { label: t('Pending'), color: 'text-yellow-500' },
      active: { label: t('Active'), color: 'text-green-500' },
      ended: { label: t('Ended'), color: 'text-blue-500' },
      cancelled: { label: t('Cancelled'), color: 'text-red-500' },
    };

    const defaultStatus = { label: t('Unknown'), color: 'text-gray-500' };
    return statusMap[status as keyof typeof statusMap] || defaultStatus;
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <Header />
        <InnerScreenContainer>
          <Column className='w-full h-64 items-center justify-center'>
            <FaSpinner className='animate-spin' size={28} />
            <div className='mt-4'>{t('Loading your games...')}</div>
          </Column>
        </InnerScreenContainer>
      </ScreenContainer>
    );
  }

  if (!publicKey) {
    return (
      <ScreenContainer>
        <Header />
        <InnerScreenContainer>
          <Column className='w-full h-64 items-center justify-center'>
            <div className='mb-4'>
              {t('Please connect your wallet to view your games')}
            </div>
          </Column>
        </InnerScreenContainer>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Header />
      <InnerScreenContainer>
        <Column className='w-full'>
          <Row className='w-full justify-between items-center mb-6'>
            <H3>{t('Your Created Games')}</H3>
            <Button onClick={handleCreateNewGame}>
              {t('Create New Game')}
            </Button>
          </Row>

          {error && (
            <Card className='w-full mb-6 bg-red-100 border-red-300'>
              <div className='text-red-500'>{error}</div>
            </Card>
          )}

          {games.length === 0 ? (
            <Card className='w-full p-6 text-center'>
              <PrimaryText>
                {t("You haven't created any games yet.")}
              </PrimaryText>
              <Button className='mt-4' onClick={handleCreateNewGame}>
                {t('Create Your First Game')}
              </Button>
            </Card>
          ) : (
            <Grid min='300px' gapSize='1.5rem' className='w-full'>
              {games.map((game) => {
                const status = getStatusLabel(game.status);
                return (
                  <Card
                    key={game.id}
                    className='w-full overflow-hidden cursor-pointer hover:shadow-lg transition-shadow'
                    onClick={() => handleViewGame(game.game_code)}
                  >
                    {game.image_url && (
                      <div className='w-full h-40 overflow-hidden'>
                        <Image
                          src={game.image_url}
                          alt={game.name}
                          className='w-full h-full object-cover'
                        />
                      </div>
                    )}
                    <div className='p-4'>
                      <Row className='w-full justify-between mb-2'>
                        <PrimaryText className='font-bold truncate'>
                          {game.name}
                        </PrimaryText>
                        <Label className={status.color}>{status.label}</Label>
                      </Row>
                      <Row className='w-full justify-between mb-1'>
                        <Label>{t('Game Code')}:</Label>
                        <Label className='font-mono'>{game.game_code}</Label>
                      </Row>
                      <Row className='w-full justify-between mb-1'>
                        <Label>{t('Entry Fee')}:</Label>
                        <Label>
                          {formatEntryFee(
                            game.entry_fee,
                            game.token_mint ===
                              'So11111111111111111111111111111111111111112'
                          )}
                        </Label>
                      </Row>
                      <Row className='w-full justify-between'>
                        <Label>{t('Created')}:</Label>
                        <Label>{formatDate(game.created_at)}</Label>
                      </Row>
                    </div>
                  </Card>
                );
              })}
            </Grid>
          )}
        </Column>
      </InnerScreenContainer>
    </ScreenContainer>
  );
};
