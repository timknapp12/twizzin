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
import { GameState } from '@/utils';

const Game = () => {
  const params = useParams();
  const gameCode = params.gameCode;
  const { getGameByCode, partialGameData, gameResult, gameState, gameData } =
    useGameContext();

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // fetch the game data when the url contains a game code
  useEffect(() => {
    if (!gameCode) return;
    if (typeof gameCode === 'string' && !partialGameData) {
      getGameByCode(gameCode);
    }
  }, [gameCode, getGameByCode, partialGameData]);

  if (!isMounted) {
    return <GameDetailsSkeleton />;
  }

  // Render the appropriate component based on game state
  const renderGameContent = () => {
    // If player has submitted answers and we have results, show results screen
    if (gameResult) {
      return <PlayerGameResults />;
    }

    // If game is active, show the game play screen
    if (gameState === GameState.ACTIVE || gameData?.status === 'active') {
      return <PlayGame />;
    }

    // If game is in JOINING or JOINED state, show join details
    if (gameState === GameState.JOINING || gameState === GameState.JOINED) {
      if (partialGameData) {
        return <JoinGameDetails partialGameData={partialGameData} />;
      }
    }

    // Default to loading skeleton
    return <GameDetailsSkeleton />;
  };

  return (
    <ScreenContainer>
      <Header />
      <InnerScreenContainer>{renderGameContent()}</InnerScreenContainer>
    </ScreenContainer>
  );
};

export default Game;
