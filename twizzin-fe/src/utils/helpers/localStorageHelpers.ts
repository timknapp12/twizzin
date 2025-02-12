import { GameAnswer, StoredGameSession } from '@/types';

const GAME_SESSION_KEY = 'game_session';

/**
 * Save a game answer to local storage
 */
export const saveGameAnswer = (
  gameCode: string,
  answer: GameAnswer
): StoredGameSession => {
  try {
    const session = getGameSession(gameCode);

    // If no session exists, create one with start time
    if (!session) {
      const newSession: StoredGameSession = {
        gameCode,
        gamePubkey: '', // Will be set when joining game
        startTime: Date.now(),
        answers: {
          [answer.questionId]: answer,
        },
        submittedTime: null,
      };
      localStorage.setItem(GAME_SESSION_KEY, JSON.stringify(newSession));
      return newSession;
    }

    // Add answer to existing session
    session.answers[answer.questionId] = answer;
    localStorage.setItem(GAME_SESSION_KEY, JSON.stringify(session));
    return session;
  } catch (error) {
    console.error('Error saving game answer:', error);
    throw error;
  }
};

/**
 * Get the current game session from storage
 */
export const getGameSession = (gameCode: string): StoredGameSession | null => {
  try {
    const data = localStorage.getItem(GAME_SESSION_KEY);
    if (!data) return null;

    const session: StoredGameSession = JSON.parse(data);
    return session.gameCode === gameCode ? session : null;
  } catch (error) {
    console.error('Error getting game session:', error);
    return null;
  }
};

/**
 * Initialize or update game session with game pubkey
 */
export const initializeGameSession = (
  gameCode: string,
  gamePubkey: string
): StoredGameSession => {
  try {
    const existingSession = getGameSession(gameCode);
    const session: StoredGameSession = existingSession || {
      gameCode,
      gamePubkey,
      startTime: Date.now(),
      answers: {},
      submittedTime: null,
    };

    // Update gamePubkey if it wasn't set
    if (!existingSession?.gamePubkey) {
      session.gamePubkey = gamePubkey;
    }

    localStorage.setItem(GAME_SESSION_KEY, JSON.stringify(session));
    return session;
  } catch (error) {
    console.error('Error initializing game session:', error);
    throw error;
  }
};

/**
 * Mark game session as submitted
 */
export const markSessionSubmitted = (
  gameCode: string
): StoredGameSession | null => {
  try {
    const session = getGameSession(gameCode);
    if (!session) return null;

    session.submittedTime = Date.now();
    localStorage.setItem(GAME_SESSION_KEY, JSON.stringify(session));
    return session;
  } catch (error) {
    console.error('Error marking session as submitted:', error);
    return null;
  }
};

/**
 * Clear game session from storage
 */
export const clearGameSession = (gameCode: string): void => {
  try {
    const session = getGameSession(gameCode);
    if (session?.gameCode === gameCode) {
      localStorage.removeItem(GAME_SESSION_KEY);
    }
  } catch (error) {
    console.error('Error clearing game session:', error);
  }
};

/**
 * Get sorted answers for submission
 */
export const getSortedGameAnswers = (gameCode: string): GameAnswer[] => {
  const session = getGameSession(gameCode);
  if (!session) return [];

  return Object.values(session.answers).sort(
    (a, b) => a.displayOrder - b.displayOrder
  );
};

/**
 * Check if all questions have been answered
 */
export const areAllQuestionsAnswered = (
  gameCode: string,
  totalQuestions: number
): boolean => {
  const session = getGameSession(gameCode);
  if (!session) return false;

  const answeredQuestions = Object.keys(session.answers).length;
  return answeredQuestions === totalQuestions;
};

/**
 * Get game completion status
 */
export const getGameCompletionStatus = (
  gameCode: string,
  totalQuestions: number
): {
  isComplete: boolean;
  answeredCount: number;
  remainingCount: number;
} => {
  const session = getGameSession(gameCode);
  if (!session) {
    return {
      isComplete: false,
      answeredCount: 0,
      remainingCount: totalQuestions,
    };
  }

  const answeredCount = Object.keys(session.answers).length;
  return {
    isComplete: answeredCount === totalQuestions,
    answeredCount,
    remainingCount: totalQuestions - answeredCount,
  };
};
