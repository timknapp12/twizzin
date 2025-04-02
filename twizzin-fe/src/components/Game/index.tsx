'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { ScreenContainer, InnerScreenContainer, Column } from '@/components';
import { Header } from '../Header';
import { useGameContext, useAppContext } from '@/contexts';
import JoinGameDetails from './JoinGameDetails';
import GameDetailsSkeleton from './GameDetailsSkeleton';
import PlayGame from './PlayGame';
import PlayerGameResults from './PlayerGameResults';
import { GameState } from '@/utils';

const Game = () => {
  const params = useParams();
  const gameCode = params.gameCode as string;
  const router = useRouter();
  const { publicKey } = useWallet();
  const { getGameByCode, partialGameData, gameResult, gameState, gameData } =
    useGameContext();
  const { language, t } = useAppContext();

  const [isMounted, setIsMounted] = useState(false);

  // Route-level redirect logic
  useEffect(() => {
    if (!gameCode || !publicKey || !partialGameData) return;

    const isGameAdmin = Boolean(
      publicKey.toBase58() === partialGameData.admin_wallet
    );

    if (isGameAdmin) {
      // If admin, redirect to creator route
      router.push(`/${language}/creator/game/${gameCode}`);
    }
  }, [publicKey, partialGameData, gameCode, router, language]);

  // Fetch partial game data
  useEffect(() => {
    if (!gameCode || !isMounted) return;
    if (!partialGameData) {
      getGameByCode(gameCode);
    }
  }, [gameCode, getGameByCode, partialGameData, isMounted]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <GameDetailsSkeleton />;

  const renderGameContent = () => {
    if (gameResult) return <PlayerGameResults />;
    if (gameState === GameState.ACTIVE || gameData?.status === 'active')
      return <PlayGame />;
    if (gameState === GameState.JOINING || gameState === GameState.JOINED) {
      if (partialGameData)
        return <JoinGameDetails partialGameData={partialGameData} />;
    }
    return <GameDetailsSkeleton />;
  };

  // Show "Connect Wallet" screen if publicKey is null
  if (publicKey === null) {
    return (
      <ScreenContainer>
        <Header />
        <InnerScreenContainer>
          <Column className='w-full h-64 items-center justify-center'>
            <div className='text-xl mb-4'>
              {t('Please Connect Your Wallet')}
            </div>
            <div>{t('You need to connect your wallet to view this game.')}</div>
          </Column>
        </InnerScreenContainer>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Header />
      <InnerScreenContainer>{renderGameContent()}</InnerScreenContainer>
    </ScreenContainer>
  );
};

export default Game;
