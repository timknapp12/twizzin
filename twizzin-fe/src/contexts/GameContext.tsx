'use client';

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  GameContextType,
  PartialGame,
  JoinGameParams,
  JoinFullGame,
  GameAnswer,
  StoredGameSession,
  GameSession,
} from '@/types';
import {
  getPartialGameFromDb,
  getGameFromDb,
  joinGameCombined,
  deriveGamePDAs,
  derivePlayerPDA,
  initializeGameSession,
  getGameSession,
  saveGameAnswer,
  getGameCompletionStatus,
  markSessionSubmitted,
  calculateTotalTimeMs,
  supabase,
  startGameCombined,
  setGameStartStatus,
  submitAnswersCombined,
} from '@/utils';
import { useAppContext, useProgram } from '.';
import { PublicKey } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error(
      'useGameContext must be used within an GameContextProvider'
    );
  }
  return context;
};

export const GameContextProvider = ({ children }: { children: ReactNode }) => {
  const { t, language } = useAppContext();
  const [gameCode, setGameCode] = useState('NYVWFN');
  const [partialGameData, setPartialGameData] = useState<PartialGame | null>(
    null
  );
  const [gameData, setGameData] = useState<JoinFullGame>({} as JoinFullGame);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [gameSession, setGameSession] = useState<StoredGameSession | null>(
    null
  );

  const router = useRouter();
  const { program } = useProgram();
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, sendTransaction } = wallet;

  // Load game session when game code changes
  useEffect(() => {
    if (gameCode) {
      const session = getGameSession(gameCode);
      setGameSession(session);
    }
  }, [gameCode]);

  const getGameByCode = async (code: string) => {
    try {
      const game = await getPartialGameFromDb(code);
      setPartialGameData(game);
      setGameCode(game.game_code);
      router.push(`/${language}/game/${game.game_code}`);
    } catch (error) {
      console.error('Error fetching game:', error);
      throw error;
    }
  };

  useEffect(() => {
    const checkAdmin = async () => {
      const isAdmin = publicKey?.toBase58() === partialGameData?.admin_wallet;
      setIsAdmin(isAdmin);
      if (partialGameData && isAdmin) {
        const game = await getGameFromDb(partialGameData.game_code);
        setGameData(game);
      }
    };
    checkAdmin();
  }, [publicKey, partialGameData]);

  // Add event listener cleanup ref
  const eventListenerRef = React.useRef<number | null>(null);

  // Setup game start event listener
  useEffect(() => {
    if (!program || !partialGameData || !connection) return;

    const setupEventListener = async () => {
      try {
        const { gamePda } = deriveGamePDAs(
          program,
          new PublicKey(partialGameData.admin_wallet),
          partialGameData.game_code
        );

        // Listen for GameStarted event
        const listener = program.addEventListener(
          'gameStarted',
          async (event) => {
            // Verify this event is for our game
            // @ts-ignore
            if (event.game.toString() === gamePda.toString()) {
              console.log('Game started event received:', event);
              // @ts-ignore
              const actualStartTime = event.startTime.toNumber();
              // @ts-ignore
              const actualEndTime = event.endTime.toNumber();
              // Update game data with new start/end times
              setGameData((prev) => ({
                ...prev,
                start_time: new Date(actualStartTime).toISOString(),
                end_time: new Date(actualEndTime).toISOString(),
              }));

              setIsGameStarted(true);

              // Save to local storage
              setGameStartStatus(
                partialGameData.game_code,
                actualStartTime,
                actualEndTime
              );

              // Initialize game session if it doesn't exist
              if (!gameSession) {
                const newSession = initializeGameSession(
                  partialGameData.game_code,
                  gamePda.toString()
                );
                setGameSession(newSession);
              }
            }
          }
        );

        // Store listener ID for cleanup
        eventListenerRef.current = listener;
      } catch (error) {
        console.error('Error setting up game start listener:', error);
      }
    };

    setupEventListener();

    // Cleanup function
    return () => {
      if (eventListenerRef.current !== null && program) {
        program.removeEventListener(eventListenerRef.current);
        eventListenerRef.current = null;
      }
    };
  }, [program, partialGameData, connection, gameSession]);

  // Existing handleJoinGame implementation...
  const handleJoinGame = async (): Promise<string | null> => {
    if (!program) throw new Error(t('Program not initialized'));
    if (!partialGameData) throw new Error('Game data not found');
    if (!publicKey) throw new Error(t('Please connect your wallet'));
    if (!sendTransaction)
      throw new Error(t('Wallet adapter not properly initialized'));

    try {
      const { gamePda } = deriveGamePDAs(
        program,
        new PublicKey(partialGameData.admin_wallet),
        partialGameData.game_code
      );

      const playerPda = derivePlayerPDA(program, gamePda, publicKey);

      let hasJoined = false;
      try {
        // @ts-ignore
        const playerAccount = await program.account.playerAccount.fetch(
          playerPda
        );
        console.log('Player account exists:', playerAccount);
        hasJoined = true;
      } catch (e: any) {
        if (e.message.includes('does not exist')) {
          console.log('Player account does not exist.');
        } else {
          console.error('Error fetching playerAccount:', e);
          throw e;
        }
      }

      if (hasJoined || isAdmin) {
        const game = await getGameFromDb(partialGameData.game_code);
        setGameData(game);
        return null;
      }

      const params: JoinGameParams = {
        gameCode: partialGameData.game_code,
        admin: new PublicKey(partialGameData.admin_wallet),
        tokenMint: new PublicKey(partialGameData.token_mint),
        entryFee: partialGameData.entry_fee,
      };

      const result = await joinGameCombined(
        program,
        connection,
        publicKey,
        sendTransaction,
        params
      );

      if (result) {
        console.log('result', result);
        setGameData(result.game);
        return result.signature || null;
      }

      return null;
    } catch (error) {
      console.error('Error joining game:', error);
      throw error;
    }
  };

  const handleStartGame = async () => {
    if (!program) throw new Error(t('Program not initialized'));
    if (!partialGameData) throw new Error('Game data not found');
    if (!publicKey) throw new Error(t('Please connect your wallet'));
    if (!sendTransaction)
      throw new Error(t('Wallet adapter not properly initialized'));

    // Calculate total time in milliseconds
    const totalTimeMs = calculateTotalTimeMs(
      gameData.start_time,
      gameData.end_time
    );

    // Validate the time calculation
    if (typeof totalTimeMs !== 'number' || isNaN(totalTimeMs)) {
      throw new Error('Invalid time calculation');
    }

    const result = await startGameCombined(
      program,
      connection,
      publicKey,
      sendTransaction,
      supabase,
      {
        gameId: gameData.id,
        gameCode: gameData.game_code,
        totalTimeMs,
      }
    );

    if (result.success) {
      console.log('Game start transaction successful');
      setIsGameStarted(true);
    } else {
      console.error('Failed to start game:', result.error);
      throw new Error(t('Failed to start game'));
    }
  };

  // New answer management functions
  const submitAnswer = (answer: GameAnswer) => {
    if (!gameCode) return;

    const updatedSession = saveGameAnswer(gameCode, answer);
    setGameSession(updatedSession);
  };

  const getCurrentAnswer = (questionId: string): GameAnswer | undefined => {
    if (!gameSession || !gameSession.answers[questionId]) return undefined;
    // Get the selected answer from game session
    const selectedAnswer = gameSession.answers[questionId];
    // Find the question in gameData
    const question = gameData.questions.find((q) => q.id === questionId);
    // Find the full answer data from the question's answers
    const fullAnswer = question?.answers.find(
      (a) =>
        a.display_letter === selectedAnswer.answer ||
        a.answer_text === selectedAnswer.answer
    );
    if (!fullAnswer) return undefined;
    return {
      answerId: fullAnswer.id, // Use actual answer ID
      answerText: fullAnswer.answer_text, // Use actual answer text
      displayOrder: fullAnswer.display_order,
      questionId: fullAnswer.question_id,
      timestamp: Date.now(),
      displayLetter: fullAnswer.display_letter,
    };
  };

  const getGameProgress = () => {
    return getGameCompletionStatus(gameCode, gameData.questions?.length ?? 0);
  };

  const handleSubmitAnswers = async () => {
    if (!gameSession || !program || !publicKey || !gameData) {
      console.error('Missing required parameters for game submission');
      return;
    }

    try {
      // Convert StoredGameSession to GameSession format
      const formattedGameSession = {
        answers: Object.values(gameSession.answers).map((answer) => ({
          displayOrder: answer.displayOrder,
          answer: answer.answer,
          questionId: answer.questionId,
        })),
        startTime: new Date(gameSession.startTime).getTime(),
        finishTime: Date.now(), // Current time as finish time
        submitted: gameSession.submitted,
      };

      // Wrap the markSessionSubmitted function to return correct type
      const markSessionSubmittedWrapper = (
        gameCode: string
      ): GameSession | null => {
        const storedSession = markSessionSubmitted(gameCode);
        if (!storedSession) return null;

        return {
          answers: Object.values(storedSession.answers).map((answer) => ({
            displayOrder: answer.displayOrder,
            answer: answer.answer,
            questionId: answer.questionId,
          })),
          startTime: new Date(storedSession.startTime).getTime(),
          finishTime: Date.now(),
          submitted: storedSession.submitted,
        };
      };

      // Wrap setGameSession to handle type conversion
      const setGameSessionWrapper = (session: GameSession) => {
        const storedFormat = {
          gameCode: gameSession.gameCode,
          gamePubkey: gameSession.gamePubkey,
          startTime: session.startTime,
          answers: session.answers.reduce(
            (acc, answer) => ({
              ...acc,
              [answer.questionId]: answer,
            }),
            {}
          ),
          submitted: session.submitted,
          submittedTime: session.finishTime,
        };

        setGameSession(storedFormat);
      };

      const result = await submitAnswersCombined({
        program,
        connection,
        publicKey,
        sendTransaction,
        gameData,
        gameSession: formattedGameSession,
        markSessionSubmitted: markSessionSubmittedWrapper,
        setGameSession: setGameSessionWrapper,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit game');
      }

      return result.solanaSignature;
    } catch (error: any) {
      console.error('Error submitting game:', error);
      throw error;
    }
  };

  return (
    <GameContext.Provider
      value={{
        gameCode,
        setGameCode,
        partialGameData,
        getGameByCode,
        handleJoinGame,
        gameData,
        isAdmin,
        isGameStarted,
        submitAnswer,
        getCurrentAnswer,
        getGameProgress,
        handleStartGame,
        handleSubmitAnswers,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export default GameContextProvider;
