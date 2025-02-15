import { GameResultFromDb, GameResultQuestion, RawGameResult } from '@/types';
import { supabase } from './supabaseClient';

export const fetchRawGameResult = async (
  gameId: string,
  playerWallet: string
): Promise<RawGameResult | null> => {
  try {
    // First get the player_game record
    const { data: playerGame, error: playerGameError } = await supabase
      .from('player_games')
      .select(
        `
          *,
          player_answers (
            question_id,
            selected_answer,
            is_correct,
            answered_at
          )
        `
      )
      .eq('game_id', gameId)
      .eq('player_wallet', playerWallet)
      .single();

    if (playerGameError) throw playerGameError;
    if (!playerGame) return null;

    // Then get all questions and answers for the game
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select(
        `
          id,
          question_text,
          display_order,
          answers (
            id,
            answer_text,
            display_letter,
            is_correct
          )
        `
      )
      .eq('game_id', gameId)
      .order('display_order', { ascending: true });

    if (questionsError) throw questionsError;

    return {
      playerGame,
      questions,
    };
  } catch (error) {
    console.error('Error fetching raw game result:', error);
    throw error;
  }
};

export const formatGameResult = (
  rawResult: RawGameResult
): GameResultFromDb => {
  const { playerGame, questions } = rawResult;

  // Map through questions to create result data
  const answeredQuestions: GameResultQuestion[] = questions.map((question) => {
    const playerAnswer = playerGame.player_answers.find(
      (pa) => pa.question_id === question.id
    );
    const correctAnswer = question.answers.find((a) => a.is_correct);

    // Find the full answer details for the user's selected answer
    const userSelectedAnswer = question.answers.find(
      (a) => a.answer_text === playerAnswer?.selected_answer
    );

    return {
      questionId: question.id,
      questionText: question.question_text,
      userAnswer: userSelectedAnswer
        ? {
            text: userSelectedAnswer.answer_text,
            displayLetter: userSelectedAnswer.display_letter,
          }
        : null,
      correctAnswer: {
        text: correctAnswer?.answer_text || '',
        displayLetter: correctAnswer?.display_letter || '',
      },
      isCorrect: playerAnswer?.is_correct || false,
      displayOrder: question.display_order,
    };
  });

  // Sort questions by display order
  answeredQuestions.sort((a, b) => a.displayOrder - b.displayOrder);

  return {
    answeredQuestions,
    totalCorrect: playerGame.num_correct || 0,
    totalQuestions: questions.length,
    completedAt: playerGame.finished_time,
    finalRank: playerGame.final_rank,
    xpEarned: playerGame.xp_earned,
    rewardsEarned: playerGame.rewards_earned,
  };
};

// Combined function for convenience
export const fetchGameResult = async (
  gameId: string,
  playerWallet: string
): Promise<GameResultFromDb | null> => {
  const rawResult = await fetchRawGameResult(gameId, playerWallet);
  if (!rawResult) return null;
  return formatGameResult(rawResult);
};
