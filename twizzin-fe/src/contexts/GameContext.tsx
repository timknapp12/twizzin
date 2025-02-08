'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  GameContextType,
  PartialGame,
  JoinGameParams,
  JoinFullGame,
} from '@/types';
import { getPartialGameFromDb, joinGameCombined } from '@/utils';
import { useAppContext, useProgram } from '.';
import { PublicKey } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

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
  const [gameCode, setGameCode] = useState('663RJF');
  const [partialGameData, setPartialGameData] = useState<PartialGame | null>(
    null
  );
  const [gameData, setGameData] = useState<JoinFullGame>({} as JoinFullGame);

  console.log('partialGameData', partialGameData);
  console.log('gameData', gameData);
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

  const { program } = useProgram();
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, sendTransaction } = wallet;

  const handleJoinGame = async () => {
    if (!program) {
      console.error('Program not initialized');
      return;
    }
    if (!partialGameData) throw new Error('Game data not found');
    try {
      const params: JoinGameParams = {
        gameCode: partialGameData.game_code,
        admin: new PublicKey(partialGameData.admin_wallet),
        tokenMint: new PublicKey(partialGameData.token_mint),
        entryFee: partialGameData.entry_fee,
      };
      const result = await joinGameCombined(
        program,
        connection,
        publicKey!, // Add non-null assertion since we know publicKey exists at this point
        sendTransaction,
        params
      );
      if (result) {
        console.log('result', result);
        setGameData(result.game);
      }
    } catch (error) {
      console.error('Error joining game:', error);
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
        handleJoinGame,
        gameData,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
