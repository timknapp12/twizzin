'use client';

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from 'react';
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
  const [gameCode, setGameCode] = useState('XEB2NK');
  const [partialGameData, setPartialGameData] = useState<PartialGame | null>(
    null
  );
  const [gameData, setGameData] = useState<JoinFullGame>({} as JoinFullGame);
  const [isAdmin, setIsAdmin] = useState(false);

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

  useEffect(() => {
    const checkAdmin = async () => {
      const isAdmin = publicKey?.toBase58() === partialGameData?.admin_wallet;
      setIsAdmin(isAdmin);
      if (partialGameData) {
        const game = await getGameFromDb(partialGameData.game_code);
        setGameData(game);
      }
    };
    checkAdmin();
  }, [publicKey, partialGameData]);

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

      // Check if playerAccount exists
      let hasJoined = false;
      try {
        // @ts-ignore
        const playerAccount = await program.account.playerAccount.fetch(
          playerPda
        );
        console.log('Player account exists:', playerAccount);
        hasJoined = true;
      } catch (e: any) {
        if (e.message.includes('does not exist')) {
          console.log('Player account does not exist.');
        } else {
          console.error('Error fetching playerAccount:', e);
          throw e;
        }
      }

      if (hasJoined || isAdmin) {
        const game = await getGameFromDb(partialGameData.game_code);
        setGameData(game);
        return;
      }

      // Proceed to join the game since player hasn't joined yet
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
        isAdmin,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
