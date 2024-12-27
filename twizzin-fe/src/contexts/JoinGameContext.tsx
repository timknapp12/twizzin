'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { JoinGameContextType, PartialGame } from '@/types';
import { getPartialGameFromDb } from '@/utils/supabase/getGameFromDb';

const JoinGameContext = createContext<JoinGameContextType | undefined>(
  undefined
);

export const useJoinGameContext = () => {
  const context = useContext(JoinGameContext);
  if (!context) {
    throw new Error(
      'useJoinGameContext must be used within an JoinGameContextProvider'
    );
  }
  return context;
};

export const JoinGameContextProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [gameCode, setGameCode] = useState('LXBUZQ');
  const [partialGameData, setPartialGameData] = useState<PartialGame | null>(
    null
  );

  const getGameByCode = async (gameCode: string) => {
    try {
      const game = await getPartialGameFromDb(gameCode);
      setPartialGameData(game);
    } catch (error) {
      console.error('Error fetching game:', error);
      throw error;
    }
  };

  return (
    <JoinGameContext.Provider
      value={{
        gameCode,
        setGameCode,
        partialGameData,
        getGameByCode,
      }}
    >
      {children}
    </JoinGameContext.Provider>
  );
};
