'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  GameContextType,
  PartialGame,
  JoinGameParams,
  JoinFullGame,
} from '@/types';
import {
  getPartialGameFromDb,
  getGameFromDb,
  joinGameCombined,
  deriveGamePDAs,
  derivePlayerPDA,
} from '@/utils';
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
  const { t, language } = useAppContext();
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
      console.error(t('Program not initialized'));
      return;
    }
    if (!partialGameData) throw new Error('Game data not found');
    if (!publicKey) throw new Error(t('Please connect your wallet'));
    if (!sendTransaction)
      throw new Error(t('Wallet adapter not properly initialized'));

    try {
      // Get the game PDA and player PDA
      const { gamePda } = deriveGamePDAs(
        program,
        new PublicKey(partialGameData.admin_wallet),
        partialGameData.game_code
      );

      const playerPda = derivePlayerPDA(program, gamePda, publicKey);

      // Fetch and log game account
      // @ts-ignore
      const gameAccount = await program.account.game.fetch(gamePda);
      console.log('Game account:', gameAccount);

      // Try to fetch the player account
      try {
        // @ts-ignore
        const playerAccount = await program.account.playerAccount.fetch(
          playerPda
        );
        if (playerAccount) {
          const game = await getGameFromDb(partialGameData.game_code);
          setGameData(game);
          return;
        }
      } catch (e: any) {
        // If the account doesn't exist, this is good - means user hasn't joined
        if (e.message !== 'Account does not exist') {
          throw e;
        }
      }

      // Return if game account doesn't match expected state
      if (!gameAccount) {
        console.error(t('Game account not found'));
        return;
      }

      const params: JoinGameParams = {
        gameCode: partialGameData.game_code,
        admin: new PublicKey(partialGameData.admin_wallet),
        tokenMint: new PublicKey(partialGameData.token_mint),
        entryFee: partialGameData.entry_fee,
      };

      const result = await joinGameCombined(
        program,
        connection,
        publicKey,
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
