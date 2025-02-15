import { GameAnswer, StoredGameSession, GameStartStatus } from '@/types';

const GAME_SESSION_KEY = 'game_session';
const GAME_START_STATUS_KEY = 'game_start_status';

// Save a game answer to local storage
export const saveGameAnswer = (
  gameCode: string,
  answer: GameAnswer
): StoredGameSession | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const session = getGameSession(gameCode);

    // Convert GameAnswer to stored answer format
    const storedAnswer = {
      displayOrder: answer.displayOrder,
      answer: answer.answerText, // Using answerText as the stored answer
      questionId: answer.questionId,
    };

    // If no session exists, create one with start time
    if (!session) {
      const newSession: StoredGameSession = {
        gameCode,
        gamePubkey: '', // Will be set when joining game
        startTime: Date.now(),
        answers: {
          [answer.questionId]: storedAnswer,
        },
        submitted: false,
        submittedTime: undefined, // Changed from null to undefined
      };
      localStorage.setItem(GAME_SESSION_KEY, JSON.stringify(newSession));
      return newSession;
    }

    // Add answer to existing session
    session.answers[answer.questionId] = storedAnswer;
    localStorage.setItem(GAME_SESSION_KEY, JSON.stringify(session));
    return session;
  } catch (error) {
    console.error('Error saving game answer:', error);
    throw error;
  }
};

// Get the current game session from storage
export const getGameSession = (gameCode: string): StoredGameSession | null => {
  if (typeof window === 'undefined') {
    return null;
  }

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

// Initialize or update game session with game pubkey
export const initializeGameSession = (
  gameCode: string,
  gamePubkey: string
): StoredGameSession | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const existingSession = getGameSession(gameCode);
    const session: StoredGameSession = existingSession || {
      gameCode,
      gamePubkey,
      startTime: Date.now(),
      answers: {},
      submitted: false,
      submittedTime: undefined,
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

// Mark game session as submitted
export const markSessionSubmitted = (
  gameCode: string,
  finishTime?: number // Optional parameter to allow setting initial finish time
): StoredGameSession | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const session = getGameSession(gameCode);
    if (!session) return null;

    // Only set submittedTime if it hasn't been set before
    if (!session.submittedTime) {
      session.submittedTime = finishTime || Date.now();
    }

    localStorage.setItem(GAME_SESSION_KEY, JSON.stringify(session));
    return session;
  } catch (error) {
    console.error('Error marking session as submitted:', error);
    return null;
  }
};

// Clear game session from storage
export const clearGameSession = (gameCode: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const session = getGameSession(gameCode);
    if (session?.gameCode === gameCode) {
      localStorage.removeItem(GAME_SESSION_KEY);
    }
  } catch (error) {
    console.error('Error clearing game session:', error);
  }
};

// Get sorted answers for submission
export const getSortedGameAnswers = (gameCode: string): GameAnswer[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const session = getGameSession(gameCode);
  if (!session) return [];

  return Object.values(session.answers)
    .map((storedAnswer) => ({
      questionId: storedAnswer.questionId,
      answerId: storedAnswer.questionId, // Using questionId as answerId
      answerText: storedAnswer.answer,
      displayOrder: storedAnswer.displayOrder,
      timestamp: session.startTime, // Using session start time as timestamp
      displayLetter: storedAnswer.answer, // Using stored answer as display letter
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder);
};

// Check if all questions have been answered
export const areAllQuestionsAnswered = (
  gameCode: string,
  totalQuestions: number
): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const session = getGameSession(gameCode);
  if (!session) return false;

  const answeredQuestions = Object.keys(session.answers).length;
  return answeredQuestions === totalQuestions;
};

// Get game completion status
export const getGameCompletionStatus = (
  gameCode: string,
  totalQuestions: number
): {
  isComplete: boolean;
  answeredCount: number;
  remainingCount: number;
} => {
  if (typeof window === 'undefined') {
    return {
      isComplete: false,
      answeredCount: 0,
      remainingCount: totalQuestions,
    };
  }

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

// GAME SESSION STATUS
export const getGameStartStatus = (gameCode: string): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const data = localStorage.getItem(GAME_START_STATUS_KEY);
    if (!data) return false;

    const statuses: GameStartStatus = JSON.parse(data);
    return statuses[gameCode]?.isManuallyStarted || false;
  } catch (error) {
    console.error('Error getting game start status:', error);
    return false;
  }
};

export const setGameStartStatus = (
  gameCode: string,
  actualStartTime: number,
  actualEndTime: number
) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const data = localStorage.getItem(GAME_START_STATUS_KEY);
    const statuses: GameStartStatus = data ? JSON.parse(data) : {};

    statuses[gameCode] = {
      isManuallyStarted: true,
      actualStartTime,
      actualEndTime,
    };

    localStorage.setItem(GAME_START_STATUS_KEY, JSON.stringify(statuses));
  } catch (error) {
    console.error('Error setting game start status:', error);
  }
};

export const clearGameStartStatus = (gameCode: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const data = localStorage.getItem(GAME_START_STATUS_KEY);
    if (!data) return;

    const statuses: GameStartStatus = JSON.parse(data);
    if (statuses[gameCode]) {
      delete statuses[gameCode];
      localStorage.setItem(GAME_START_STATUS_KEY, JSON.stringify(statuses));
    }
  } catch (error) {
    console.error('Error clearing game start status:', error);
  }
};
