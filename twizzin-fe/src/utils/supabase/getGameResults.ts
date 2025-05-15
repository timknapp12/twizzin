import {
  GameResultFromDb,
  GameResultQuestion,
  RawGameResult,
  PlayerSubmission,
  GameResults,
  PlayerResult,
} from '@/types';
import { supabase } from './supabaseClient';

interface UsernameMap {
  [key: string]: string | null;
}

type VerificationFunction = <T>(operation: () => Promise<T>, errorMessage?: string) => Promise<T | null>;

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
  console.log('Raw player game data from DB:', playerGame);

  // Map through questions to create result data
  const answeredQuestions: GameResultQuestion[] = questions.map((question) => {
    const playerAnswer = playerGame.player_answers.find(
      (pa) => pa.question_id === question.id
    );
    const correctAnswer = question.answers.find((a) => a.is_correct);
    // Find the full answer details for the user's selected answer
    const userSelectedAnswer = question.answers.find(
      (a) => a.display_letter === playerAnswer?.selected_answer
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
  gameId: string,
  withVerification: VerificationFunction
): Promise<PlayerSubmission[]> => {
  const result = await withVerification(async () => {
    // First, get the player_games data
    const { data, error } = await supabase
      .from('player_games')
      .select('player_wallet, num_correct, finished_time')
      .eq('game_id', gameId)
      .not('finished_time', 'is', null) // Only get completed games
      .order('num_correct', { ascending: false })
      .order('finished_time', { ascending: true });

    if (error)
      throw new Error(`Failed to fetch game submissions: ${error.message}`);

    if (!data || data.length === 0) return [];

    // Get all unique wallet addresses to query usernames
    const walletAddresses = data.map((item) => item.player_wallet);

    // Get usernames for all players in one query
    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('wallet_address, username')
      .in('wallet_address', walletAddresses);

    if (playersError)
      throw new Error(
        `Failed to fetch player usernames: ${playersError.message}`
      );

    // Create a map of wallet addresses to usernames for quick lookup
    const usernameMap: Record<string, string> = {};
    playersData?.forEach((player) => {
      usernameMap[player.wallet_address] = player.username;
    });

    // Transform the data to include username
    const transformedData = data.map((submission) => ({
      player_wallet: submission.player_wallet,
      num_correct: submission.num_correct,
      finished_time: submission.finished_time,
      username: usernameMap[submission.player_wallet] || null,
    })) as PlayerSubmission[];

    return transformedData;
  });

  return result || [];
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
    username: sub.username,
    numCorrect: sub.num_correct,
    finishTime: sub.finished_time,
    rank: index + 1,
    isWinner: index < numWinners,
  }));

  const winners = allPlayers.filter((player) => player.isWinner);

  return { winners, allPlayers };
};

export const fetchGameLeaderboard = async (
  gameId: string,
  withVerification: VerificationFunction
): Promise<GameResults | null> => {
  return withVerification(async () => {
    if (!gameId) {
      console.warn('fetchGameLeaderboard: Missing gameId.');
      return null;
    }

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
      const submissions = await fetchGameSubmissions(gameId, withVerification);

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
  });
};

// Utility to fetch both game result and leaderboard
export const fetchGameResultAndLeaderboard = async (
  gameId: string,
  playerWallet: string,
  withVerification: VerificationFunction
): Promise<{
  playerResult: GameResultFromDb | null;
  gameResults: GameResults | null;
}> => {
  const result = await withVerification(async () => {
    if (!gameId || !playerWallet) {
      console.warn('fetchGameResultAndLeaderboard: Missing required parameters.');
      return {
        playerResult: null,
        gameResults: null,
      };
    }

    try {
      const [playerResult, gameResults] = await Promise.all([
        fetchGameResult(gameId, playerWallet),
        fetchGameLeaderboard(gameId, withVerification),
      ]);

      return {
        playerResult,
        gameResults,
      };
    } catch (error) {
      console.error('Error fetching game result and leaderboard:', error);
      throw error;
    }
  });

  return result || { playerResult: null, gameResults: null };
};

// Data fetching when game ends
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000;

export const fetchCompleteGameResults = async (
  gameId: string,
  gameCode: string,
  playerWallet: string | undefined,
  withVerification: VerificationFunction,
  attempt = 1
): Promise<{
  gameData: GameResultFromDb & { adminUsername: string | null };
  leaderboard: (PlayerResult & { username: string | null })[];
  winners: (PlayerResult & { username: string | null })[];
  playerResult: (GameResultFromDb & { username: string | null }) | null;
}> => {
  const result = await withVerification(async () => {
    if (!gameId) {
      console.warn('fetchCompleteGameResults: Missing gameId.');
      return {
        gameData: {} as GameResultFromDb & { adminUsername: string | null },
        leaderboard: [],
        winners: [],
        playerResult: null,
      };
    }

    try {
      // Step 1: Fetch core game data (always needed)
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (gameError) throw gameError;

      // Step 2: Fetch admin username
      let adminUsername = null;
      if (gameData.admin_wallet) {
        const { data: adminData } = await supabase
          .from('players')
          .select('username')
          .eq('wallet_address', gameData.admin_wallet)
          .single();

        adminUsername = adminData?.username || null;
      }

      // Step 3: Fetch leaderboard data (for all users)
      const gameResults = await fetchGameLeaderboard(gameId, withVerification);

      // Step 4: Fetch usernames for all players in the leaderboard
      const playerWallets =
        gameResults?.allPlayers.map((player) => player.wallet) || [];
      let playerUsernames: UsernameMap = {}; // Use the defined type

      if (playerWallets.length > 0) {
        const { data: playersData } = await supabase
          .from('players')
          .select('wallet_address, username')
          .in('wallet_address', playerWallets);

        // Create a lookup map of wallet to username
        playerUsernames = (playersData || []).reduce(
          (acc: UsernameMap, player) => {
            acc[player.wallet_address] = player.username;
            return acc;
          },
          {}
        );
      }

      // Step 5: Add usernames to leaderboard and winners
      const leaderboardWithUsernames = (gameResults?.allPlayers || []).map(
        (player) => ({
          ...player,
          username: playerUsernames[player.wallet] || null,
        })
      );

      const winnersWithUsernames = (gameResults?.winners || []).map((player) => ({
        ...player,
        username: playerUsernames[player.wallet] || null,
      }));

      // Step 6: Fetch player-specific data if a wallet was provided
      let playerResult = null;
      if (playerWallet) {
        playerResult = await fetchGameResult(gameId, playerWallet);
        // Add player username to player result
        if (playerResult) {
          playerResult = {
            ...playerResult,
            username: playerUsernames[playerWallet] || null,
          };
        }
      }

      // Log the fetched data for debugging
      console.log('Complete game results fetched:', {
        gameData: { ...gameData, adminUsername },
        leaderboard: leaderboardWithUsernames,
        winners: winnersWithUsernames,
        playerResult,
        timestamp: new Date().toISOString(),
      });

      // Step 7: Return combined results
      return {
        gameData: { ...gameData, adminUsername },
        leaderboard: leaderboardWithUsernames,
        winners: winnersWithUsernames,
        playerResult,
      };
    } catch (error) {
      console.error('Error fetching complete game results:', error);
      throw error;
    }
  });

  return result || {
    gameData: {} as GameResultFromDb & { adminUsername: string | null },
    leaderboard: [],
    winners: [],
    playerResult: null,
  };
};

// Subscribe to changes in player_games table for this player and game
export const setupPlayerResultSubscription = (
  gameId: string,
  playerWallet: string,
  ref: React.RefObject<any>,
  setGameResult: React.Dispatch<React.SetStateAction<GameResultFromDb | null>>
) => {
  if (ref.current) {
    supabase.removeChannel(ref.current);
  }

  const channel = supabase
    .channel(`player_game_updates_${gameId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'player_games',
        filter: `game_id=eq.${gameId} AND player_wallet=eq.${playerWallet}`,
      },
      (payload) => {
        console.log('Database update received:', payload);

        // Create a function to apply updates to the game result
        const applyUpdates = (
          newData: any,
          prevResult: GameResultFromDb | null
        ) => {
          if (!prevResult) return prevResult;

          const updates: Partial<GameResultFromDb> = {};

          // Only include fields that have changed
          if (newData.xp_earned !== undefined) {
            updates.xpEarned = newData.xp_earned;
            console.log('Updating XP earned to:', newData.xp_earned);
          }

          if (newData.final_rank !== undefined) {
            updates.finalRank = newData.final_rank;
            console.log('Updating final rank to:', newData.final_rank);
          }

          if (newData.rewards_earned !== undefined) {
            updates.rewardsEarned = newData.rewards_earned;
            console.log('Updating rewards earned to:', newData.rewards_earned);
          }

          // If we have any updates to apply
          if (Object.keys(updates).length > 0) {
            console.log('Applying updates to game result:', updates);
            return { ...prevResult, ...updates };
          }

          return prevResult;
        };

        // Only process updates if there's new data
        if (payload.new) {
          // Update our game result with the new data
          setGameResult((prevResult) => applyUpdates(payload.new, prevResult));
        }
      }
    )
    .subscribe();

  // Use MutableRefObject type to allow assignment
  (ref as React.MutableRefObject<any>).current = channel;

  console.log(
    `Subscription setup for player ${playerWallet} in game ${gameId}`
  );

  // Return the channel for potential external handling
  return channel;
};

// Function to clean up subscription
export const cleanupPlayerResultSubscription = (ref: React.RefObject<any>) => {
  if (ref.current) {
    supabase.removeChannel(ref.current);
    (ref as React.MutableRefObject<any>).current = null;
  }
};
