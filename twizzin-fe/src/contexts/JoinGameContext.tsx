'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { JoinGameContextType } from '@/types';

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
  const [gameCode, setGameCode] = useState('');

  return (
    <JoinGameContext.Provider
      value={{
        gameCode,
        setGameCode,
      }}
    >
      {children}
    </JoinGameContext.Provider>
  );
};
