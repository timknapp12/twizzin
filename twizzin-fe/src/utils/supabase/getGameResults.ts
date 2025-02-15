import {
  GameResultFromDb,
  GameResultQuestion,
  RawGameResult,
  PlayerSubmission,
  GameResults,
} from '@/types';
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

// New functions for winners and leaderboard
export const fetchGameSubmissions = async (
  gameId: string
): Promise<PlayerSubmission[]> => {
  const { data, error } = await supabase
    .from('player_submissions')
    .select('player_wallet, num_correct, finished_time, game_id')
    .eq('game_id', gameId)
    .order('num_correct', { ascending: false })
    .order('finished_time', { ascending: true });

  if (error)
    throw new Error(`Failed to fetch game submissions: ${error.message}`);
  return data || [];
};

export const determineWinnersAndLeaderboard = (
  submissions: PlayerSubmission[],
  maxWinners: number,
  allAreWinners: boolean
): GameResults => {
  if (!submissions.length) return { winners: [], allPlayers: [] };

  const sortedSubmissions = [...submissions].sort((a, b) => {
    if (a.num_correct !== b.num_correct) {
      return b.num_correct - a.num_correct;
    }
    return a.finished_time - b.finished_time;
  });

  const numWinners = allAreWinners
    ? Math.min(sortedSubmissions.length, maxWinners)
    : Math.min(maxWinners, sortedSubmissions.length);

  const allPlayers = sortedSubmissions.map((sub, index) => ({
    wallet: sub.player_wallet,
    numCorrect: sub.num_correct,
    finishTime: sub.finished_time,
    rank: index + 1,
    isWinner: index < numWinners,
  }));

  const winners = allPlayers.filter((player) => player.isWinner);

  return { winners, allPlayers };
};

export const fetchGameLeaderboard = async (
  gameId: string
): Promise<GameResults | null> => {
  try {
    // Fetch game configuration
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('max_winners, all_are_winners')
      .eq('id', gameId)
      .single();

    if (gameError) throw gameError;
    if (!game) return null;

    // Fetch submissions
    const submissions = await fetchGameSubmissions(gameId);

    // Calculate winners and leaderboard
    return determineWinnersAndLeaderboard(
      submissions,
      game.max_winners,
      game.all_are_winners
    );
  } catch (error) {
    console.error('Error fetching game leaderboard:', error);
    throw error;
  }
};

// Utility to fetch both game result and leaderboard
export const fetchGameResultAndLeaderboard = async (
  gameId: string,
  playerWallet: string
): Promise<{
  playerResult: GameResultFromDb | null;
  gameResults: GameResults | null;
}> => {
  try {
    const [playerResult, gameResults] = await Promise.all([
      fetchGameResult(gameId, playerWallet),
      fetchGameLeaderboard(gameId),
    ]);

    return {
      playerResult,
      gameResults,
    };
  } catch (error) {
    console.error('Error fetching game result and leaderboard:', error);
    throw error;
  }
};
