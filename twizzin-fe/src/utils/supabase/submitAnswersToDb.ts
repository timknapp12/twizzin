import { supabase } from './supabaseClient';
import { VerifiedAnswer } from '@/types';

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

type VerificationFunction = <T>(operation: () => Promise<T>, errorMessage?: string) => Promise<T | null>;

export const submitAnswersToDb = async (
  gameId: string,
  playerWallet: string,
  answers: VerifiedAnswer[],
  withVerification: VerificationFunction
) => {
  return withVerification(async () => {
    try {
      // First, check if the player has already submitted answers
      const { data: existingSubmission, error: checkError } = await supabase
        .from('player_answers')
        .select('id')
        .eq('game_id', gameId)
        .eq('player_wallet', playerWallet)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingSubmission) {
        throw new Error('Player has already submitted answers for this game');
      }

      // Insert all answers in a single transaction
      const { data: submittedAnswers, error: submitError } = await supabase
        .from('player_answers')
        .insert(
          answers.map((answer) => ({
            game_id: gameId,
            player_wallet: playerWallet,
            question_id: answer.questionId,
            selected_answer: answer.answer,
            is_correct: answer.isCorrect,
            answered_at: new Date().toISOString(),
          }))
        )
        .select();

      if (submitError) {
        throw submitError;
      }

      return submittedAnswers;
    } catch (error) {
      console.error('Error submitting answers:', error);
      throw error;
    }
  });
};
