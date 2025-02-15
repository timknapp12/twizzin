'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ScreenContainer, InnerScreenContainer } from '@/components';
import { Header } from '../Header';
import { useGameContext } from '@/contexts';
import JoinGameDetails from './JoinGameDetails';
import GameDetailsSkeleton from './GameDetailsSkeleton';
import PlayGame from './PlayGame';
import PlayerGameResults from './PlayerGameResults';
import { getGameStartStatus } from '@/utils';

const Game = () => {
  const params = useParams();
  const gameCode = params.gameCode;
  const {
    getGameByCode,
    partialGameData,
    gameData,
    isGameStarted,
    gameResult,
  } = useGameContext();
  const [isManuallyStarted, setIsManuallyStarted] = useState<boolean | null>(
    null
  );
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!gameCode) return;
    if (typeof gameCode === 'string' && !partialGameData) {
      getGameByCode(gameCode);
    }
  }, [gameCode, getGameByCode, partialGameData]);

  // Check if game was manually started by admin - only runs on client
  useEffect(() => {
    if (typeof gameCode === 'string') {
      const startStatus = getGameStartStatus(gameCode);
      setIsManuallyStarted(startStatus);
    }
  }, [gameCode]);

  // Don't render anything until we're mounted and have checked local storage
  if (!isMounted) {
    return <GameDetailsSkeleton />;
  }

  // Game is only considered started when admin manually starts it
  const hasGameStarted = isGameStarted || isManuallyStarted;
  console.log('hasGameStarted', hasGameStarted);
  return (
    <ScreenContainer>
      <Header />
      <InnerScreenContainer>
        {gameResult ? (
          <PlayerGameResults />
        ) : hasGameStarted && gameData ? (
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
