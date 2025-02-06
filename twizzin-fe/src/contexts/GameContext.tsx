'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { GameContextType, PartialGame } from '@/types';
import { getPartialGameFromDb } from '@/utils/supabase/getGameFromDb';
import { useAppContext } from './AppContext';

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error(
      'useGameContext must be used within an GameContextProvider'
    );
  }
  return context;
};

export const GameContextProvider = ({ children }: { children: ReactNode }) => {
  const { language } = useAppContext();
  const [gameCode, setGameCode] = useState('LXBUZQ');
  const [partialGameData, setPartialGameData] = useState<PartialGame | null>(
    null
  );

  const router = useRouter();

  const getGameByCode = async (gameCode: string) => {
    try {
      const game = await getPartialGameFromDb(gameCode);
      setPartialGameData(game);
      router.push(`/${language}/game/${game.game_code}`);
    } catch (error) {
      console.error('Error fetching game:', error);
      throw error;
    }
  };

  return (
    <GameContext.Provider
      value={{
        gameCode,
        setGameCode,
        partialGameData,
        getGameByCode,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
