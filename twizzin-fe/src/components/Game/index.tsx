'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ScreenContainer, InnerScreenContainer } from '@/components';
import { Header } from '../Header';
import { useGameContext } from '@/contexts';
import JoinGameDetails from './JoinGameDetails';
import GameDetailsSkeleton from './GameDetailsSkeleton';

const Game = () => {
  const params = useParams();
  const gameCode = params.gameCode;
  const { getGameByCode, partialGameData } = useGameContext();

  useEffect(() => {
    if (!gameCode) return;
    if (typeof gameCode === 'string' && !partialGameData) {
      getGameByCode(gameCode);
    }
  }, [gameCode, getGameByCode, partialGameData]);

  return (
    <ScreenContainer>
      <Header />
      <InnerScreenContainer>
        {partialGameData ? (
          <JoinGameDetails partialGameData={partialGameData} />
        ) : (
          <GameDetailsSkeleton />
        )}
      </InnerScreenContainer>
    </ScreenContainer>
  );
};

export default Game;
