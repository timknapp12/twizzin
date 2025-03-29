/* eslint-disable no-unused-vars */
'use client';

import { GameAnswer, StoredGameSession } from '@/types';

// Define the Game State Enum
export enum GameState {
  BROWSING = 'BROWSING', // Initial state, no game selected
  JOINING = 'JOINING', // Viewing game details, about to join
  JOINED = 'JOINED', // User has joined but game hasn't started
  ACTIVE = 'ACTIVE', // Game is in progress
  SUBMITTED = 'SUBMITTED', // User has submitted answers but game isn't over
  ENDED = 'ENDED', // Game has officially ended, showing results
}

// Game state with metadata
export interface GameStateData {
  state: GameState;
  timestamp: number;
  metadata?: {
    startTime?: number;
    endTime?: number;
    submittedTime?: number;
    [key: string]: any;
  };
}

// Keys for localStorage
const GAME_STATE_PREFIX = 'game_state_';
const GAME_SESSION_KEY = 'game_session';

// Get the complete game state
export const getGameState = (gameCode: string): GameStateData | null => {
  if (typeof window === 'undefined') return null;

  try {
    const data = localStorage.getItem(`${GAME_STATE_PREFIX}${gameCode}`);
    if (!data) return null;

    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting game state:', error);
    return null;
  }
};

// Set game state with appropriate metadata
export const setGameState = (
  gameCode: string,
  state: GameState,
  metadata?: any
): void => {
  if (typeof window === 'undefined') return;

  try {
    const gameStateData: GameStateData = {
      state,
      timestamp: Date.now(),
      metadata: metadata || {},
    };

    localStorage.setItem(
      `${GAME_STATE_PREFIX}${gameCode}`,
      JSON.stringify(gameStateData)
    );
  } catch (error) {
    console.error('Error setting game state:', error);
  }
};

// Check if a game is in a specific state
export const isGameInState = (gameCode: string, state: GameState): boolean => {
  const gameState = getGameState(gameCode);
  return gameState?.state === state;
};

// Clear game state
export const clearGameState = (gameCode: string): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(`${GAME_STATE_PREFIX}${gameCode}`);
  } catch (error) {
    console.error('Error clearing game state:', error);
  }
};

// Additional helper methods for common state transitions
export const markGameAsJoined = (gameCode: string, metadata?: any): void => {
  setGameState(gameCode, GameState.JOINED, metadata);
};

export const markGameAsActive = (
  gameCode: string,
  startTime: number,
  endTime: number
): void => {
  setGameState(gameCode, GameState.ACTIVE, { startTime, endTime });
};

export const markGameAsSubmitted = (
  gameCode: string,
  submittedTime: number
): void => {
  setGameState(gameCode, GameState.SUBMITTED, { submittedTime });
};

export const markGameAsEnded = (gameCode: string): void => {
  setGameState(gameCode, GameState.ENDED);
};

// Backward compatibility helpers for existing code
export const getGameStartStatus = (gameCode: string): boolean => {
  return isGameInState(gameCode, GameState.ACTIVE);
};

export const getGameEndedStatus = (gameCode: string): boolean => {
  return isGameInState(gameCode, GameState.ENDED);
};

// Save a game answer to local storage (keeping compatibility with existing StoredGameSession)
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
      answer: answer.answer,
      questionId: answer.questionId,
    };

    // If no session exists, create one with start time
    if (!session) {
      const newSession: StoredGameSession = {
        gameCode,
        gamePubkey: '',
        startTime: Date.now(),
        answers: {
          [answer.questionId]: storedAnswer,
        },
        submitted: false,
        submittedTime: undefined,
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
  finishTime?: number
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

    session.submitted = true;
    localStorage.setItem(GAME_SESSION_KEY, JSON.stringify(session));

    // Also update game state
    markGameAsSubmitted(gameCode, session.submittedTime);

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
      answerId: storedAnswer.questionId,
      answer: storedAnswer.answer,
      displayOrder: storedAnswer.displayOrder,
      timestamp: session.startTime,
      displayLetter: storedAnswer.answer,
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
