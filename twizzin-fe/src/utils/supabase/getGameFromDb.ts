import { supabase } from './supabaseClient';

type VerificationFunction = <T>(operation: () => Promise<T>, errorMessage?: string) => Promise<T | null>;

export const getGameFromDb = async (gameCode: string, withVerification: VerificationFunction) => {
  return withVerification(async () => {
    if (!gameCode) {
      console.warn('getGameFromDb: Missing gameCode.');
      throw new Error('Missing gameCode.');
    }

    try {
      // First, fetch the game data without the join
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select(
          `
          *,
          questions (
            *,
            answers (*)
          )
        `
        )
        .eq('game_code', gameCode.toUpperCase())
        .single();

      if (gameError) throw gameError;
      if (!game) throw new Error('Game not found');

      // Fetch username in a separate query
      let username = null;
      if (game.admin_wallet) {
        const { data: playerData } = await supabase
          .from('players')
          .select('username')
          .eq('wallet_address', game.admin_wallet)
          .single();

        username = playerData?.username || null;
      }

      // Add the username to the returned data
      return {
        ...game,
        username,
      };
    } catch (error) {
      console.error('Error fetching game:', error);
      throw error;
    }
  });
};

export const getPartialGameFromDb = async (gameCode: string, withVerification: VerificationFunction) => {
  return withVerification(async () => {
    if (!gameCode) {
      console.warn('getPartialGameFromDb: Missing gameCode.');
      throw new Error('Missing gameCode.');
    }

    try {
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select(
          `
          game_code,
          game_pubkey,
          id,
          admin_wallet,
          name,
          token_mint,
          entry_fee,
          commission_bps,
          start_time,
          end_time,
          max_winners,
          donation_amount,
          is_native,
          all_are_winners,
          even_split,
          img_url,
          status,
          questions:questions(count)
        `
        )
        .eq('game_code', gameCode.toUpperCase())
        .single();

      if (gameError) throw gameError;
      if (!game) throw new Error('Game not found');

      // Fetch the creator's username in a separate query
      let username = null;
      if (game.admin_wallet) {
        const { data: playerData } = await supabase
          .from('players')
          .select('username')
          .eq('wallet_address', game.admin_wallet)
          .single();

        username = playerData?.username || null;
      }

      // Transform the questions count to be more directly accessible
      const gameWithExtras = {
        ...game,
        question_count: game.questions[0].count,
        username, // Add the username directly
      };
      // Create a new object without the questions property
      // eslint-disable-next-line no-unused-vars
      const { questions, ...gameWithoutQuestions } = gameWithExtras;

      return gameWithoutQuestions;
    } catch (error) {
      console.error('Error fetching partial game data:', error);
      throw error;
    }
  });
};
