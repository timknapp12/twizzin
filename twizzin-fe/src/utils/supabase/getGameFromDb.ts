import { supabase } from './supabaseClient';

export const getGameFromDb = async (gameCode: string) => {
  try {
    // Fetch game data
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

    return game;
  } catch (error) {
    console.error('Error fetching game:', error);
    throw error;
  }
};

export const getPartialGameFromDb = async (gameCode: string) => {
  try {
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select(
        `
        game_code,
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
        questions:questions(count)
      `
      )
      .eq('game_code', gameCode.toUpperCase())
      .single();

    if (gameError) throw gameError;
    if (!game) throw new Error('Game not found');

    // Transform the questions count to be more directly accessible
    const gameWithQuestionCount = {
      ...game,
      question_count: game.questions[0].count,
    };

    return gameWithQuestionCount;
  } catch (error) {
    console.error('Error fetching partial game data:', error);
    throw error;
  }
};
