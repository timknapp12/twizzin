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
    // Calculate answer hash
    const answerHash = await createAnswerHash(gameSession.answers);

    // First insert/update the player_games record and get the ID
    const { data: playerGame, error: playerGameError } = await supabase
      .from('player_games')
      .upsert(
        {
          player_wallet: playerWallet,
          game_id: gameId,
          finished_time: new Date(gameSession.finishTime).toISOString(),
          num_correct: numCorrect,
          answer_hash: answerHash,
          solana_signature: signature,
        },
        {
          // Add this configuration to match recordPlayerJoinGame
          onConflict: 'player_wallet,game_id',
          ignoreDuplicates: false,
        }
      )
      .select('id')
      .single();

    if (playerGameError) {
      console.error('Error creating player game record:', playerGameError);
      return {
        success: false,
        error: playerGameError.message || 'Failed to create player game record',
      };
    }

    if (!playerGame || !playerGame.id) {
      return {
        success: false,
        error: 'Failed to get player game ID',
      };
    }

    // Prepare the player answer records
    const playerAnswers = gameSession.answers.map((answer) => ({
      player_game_id: playerGame.id,
      question_id: answer.questionId,
      selected_answer: answer.answer,
      is_correct: answer.isCorrect,
      answered_at: new Date(gameSession.finishTime).toISOString(),
    }));

    // Insert all player answers
    const { error: answersError } = await supabase
      .from('player_answers')
      .upsert(playerAnswers, {
        // Also add this configuration for player_answers
        onConflict: 'player_game_id,question_id',
        ignoreDuplicates: false,
      });

    if (answersError) {
      console.error('Error inserting player answers:', answersError);
      return {
        success: false,
        error: answersError.message || 'Failed to insert player answers',
      };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error submitting answers to DB:', error);
    return {
      success: false,
      error: error.message || 'Failed to submit answers to database',
    };
  }
};
