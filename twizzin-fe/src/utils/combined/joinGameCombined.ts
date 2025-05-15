import { TwizzinIdl } from '@/types/idl';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { joinGame } from '../program/joinGame';
import { getGameFromDb } from '../supabase/getGameFromDb';
import { recordPlayerJoinGame } from '../supabase/playerJoinGame';
import { JoinGameParams } from '@/types';

export const joinGameCombined = async (
  program: Program<TwizzinIdl>,
  connection: Connection,
  publicKey: PublicKey,
  sendTransaction: (
    // eslint-disable-next-line no-unused-vars
    transaction: Transaction,
    // eslint-disable-next-line no-unused-vars
    connection: Connection
  ) => Promise<string>,
  params: JoinGameParams
) => {
  try {
    // First join the game on-chain
    const { success, signature, error } = await joinGame(
      program,
      connection,
      publicKey,
      sendTransaction,
      params
    );

    if (error) {
      throw new Error(error);
    }

    if (success) {
      // Get the game from the database
      const game = await getGameFromDb(params.gameCode);

      if (!game) {
        throw new Error('Game not found in database');
      }

      // Record the player join in Supabase
      await recordPlayerJoinGame(
        game.id,
        publicKey.toString(),
        params.username
      );

      return { game, signature };
    }

    throw new Error('Failed to join game');
  } catch (error) {
    console.error('Error in joinGameCombined:', error);
    throw error;
  }
};
