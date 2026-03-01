import { TwizzinIdl } from '@/types/idl';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { joinGame } from '../program/joinGame';
import { JoinGameParams } from '@/types';
import { authenticatedApiClient } from '../api/authenticatedClient';

export const joinGameCombined = async (
  program: Program<TwizzinIdl>,
  provider: AnchorProvider,
  params: JoinGameParams
) => {
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
      // Record the player join in Supabase using authenticated API
      const apiResult = await authenticatedApiClient.joinGame(
        params.gameCode,
        params.username
      );

      if (!apiResult.success) {
        throw new Error(apiResult.error || 'Failed to record game join in database');
      }

      return { 
        game: apiResult.data.game, 
        signature,
        playerGameId: apiResult.data.playerGameId 
      };
    }

    throw new Error('Failed to join game');
  } catch (error) {
    console.error('Error in joinGameCombined:', error);
    throw error;
  }
};
