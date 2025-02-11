'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ScreenContainer, InnerScreenContainer } from '@/components';
import { Header } from '../Header';
import { useGameContext } from '@/contexts';
import JoinGameDetails from './JoinGameDetails';
import GameDetailsSkeleton from './GameDetailsSkeleton';
import PlayGame from './PlayGame';

const Game = () => {
  const params = useParams();
  const gameCode = params.gameCode;
  const { getGameByCode, partialGameData, gameData, isGameStarted } =
    useGameContext();

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
        {/* TODO - use local storage to store these two vars */}
        {isGameStarted && gameData ? (
          <PlayGame />
        ) : partialGameData ? (
          <JoinGameDetails partialGameData={partialGameData} />
        ) : (
          <GameDetailsSkeleton />
        )}
      </InnerScreenContainer>
    </ScreenContainer>
  );
};

export default Game;
