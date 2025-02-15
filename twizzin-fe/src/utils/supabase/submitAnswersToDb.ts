import { SubmitAnswersToDbParams, VerifiedAnswer } from '@/types';
import { supabase } from '../supabase/supabaseClient';

// Helper function to create hash from answers using Web Crypto API
const createAnswerHash = async (answers: VerifiedAnswer[]): Promise<string> => {
  // Sort answers by display order to ensure consistent hash
  const sortedAnswers = [...answers].sort(
    (a, b) => a.displayOrder - b.displayOrder
  );

  // Create text encoder
  const encoder = new TextEncoder();

  // Concatenate all answer data
  const answerData = sortedAnswers
    .map((answer) => `${answer.questionId}:${answer.answer}`)
    .join('');

  // Create hash using SHA-256
  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(answerData)
  );

  // Convert to hex string
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export const submitAnswersToDb = async ({
  gameId,
  playerWallet,
  gameSession,
  signature,
  numCorrect,
}: SubmitAnswersToDbParams): Promise<{
  success: boolean;
  error: string | null;
}> => {
  try {
    // Start a transaction
    const { error: beginError } = await supabase.rpc('begin_transaction');
    if (beginError) throw beginError;

    try {
      // Calculate answer hash
      const answerHash = await createAnswerHash(gameSession.answers);

      // 1. Get or create player_games record
      const { data: playerGame, error: playerGameError } = await supabase
        .from('player_games')
        .upsert({
          player_wallet: playerWallet,
          game_id: gameId,
          finished_time: new Date(gameSession.finishTime),
          num_correct: numCorrect,
          answer_hash: answerHash,
          solana_signature: signature,
        })
        .select('id')
        .single();

      if (playerGameError) throw playerGameError;
      if (!playerGame) throw new Error('Failed to create player game record');

      // 2. Insert player answers
      const playerAnswers = gameSession.answers.map((answer) => ({
        player_game_id: playerGame.id,
        question_id: answer.questionId,
        selected_answer: answer.answer,
        is_correct: answer.isCorrect,
        answered_at: new Date(gameSession.finishTime),
      }));

      const { error: answersError } = await supabase
        .from('player_answers')
        .upsert(playerAnswers);

      if (answersError) throw answersError;

      // Commit the transaction
      const { error: commitError } = await supabase.rpc('commit_transaction');
      if (commitError) throw commitError;

      return { success: true, error: null };
    } catch (error) {
      // Rollback the transaction on any error
      await supabase.rpc('rollback_transaction');
      throw error;
    }
  } catch (error: any) {
    console.error('Error submitting answers to DB:', error);
    return {
      success: false,
      error: error.message || 'Failed to submit answers to database',
    };
  }
};
