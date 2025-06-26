import { TwizzinIdl } from '@/types/idl';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { joinGame } from '../program/joinGame';
import { getGameFromDb } from '../supabase/getGameFromDb';
import { recordPlayerJoinGame } from '../supabase/playerJoinGame';
import { JoinGameParams } from '@/types';

export const joinGameCombined = async (
  program: Program<TwizzinIdl>,
  provider: AnchorProvider,
  params: JoinGameParams
) => {
  const publicKey = provider.wallet.publicKey;
  try {
    // First join the game on-chain
    const { success, signature, error } = await joinGame(
      program,
      provider,
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
