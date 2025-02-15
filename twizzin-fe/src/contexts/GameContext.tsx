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
  GameResultFromDb,
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
  startGameCombined,
  setGameStartStatus,
  submitAnswersCombined,
  clearGameSession,
  clearGameStartStatus,
  endGameAndDeclareWinners,
  getGameEndedStatus,
  supabase,
  setGameEndedStatus,
} from '@/utils';
import { useAppContext, useProgram } from '.';
import { PublicKey } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  fetchGameLeaderboard,
  fetchGameResult,
} from '@/utils/supabase/getGameResults';

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
  const [gameSession, setGameSession] = useState<StoredGameSession | null>(
    null
  );
  const [gameResult, setGameResult] = useState<GameResultFromDb | null>(null);
  const [canEndGame, setCanEndGame] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

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
                status: 'active',
              }));

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

    try {
      const result = await startGameCombined(
        program,
        connection,
        publicKey,
        sendTransaction,
        {
          gameId: gameData.id,
          gameCode: gameData.game_code,
          totalTimeMs,
        }
      );

      if (result.success) {
        setGameData((prevGameData) => {
          if (prevGameData) {
            return { ...prevGameData, status: 'active' };
          }
          return prevGameData;
        });
      } else {
        console.error('Failed to start game:', result.error);
        throw new Error(t('Failed to start game'));
      }
    } catch (error: any) {
      console.error('Error in handleStartGame:', error);
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

  const handleSubmitAnswers = async (): Promise<string | undefined> => {
    if (!gameSession || !program || !publicKey || !gameData) {
      console.error('Missing required parameters for game submission');
      return undefined;
    }

    try {
      // Get or set finish time
      const finishTime = gameSession.submittedTime || Date.now();

      // Convert StoredGameSession to GameSession format
      const formattedGameSession = {
        answers: Object.values(gameSession.answers).map((answer) => ({
          displayOrder: answer.displayOrder,
          answer: answer.answer,
          questionId: answer.questionId,
        })),
        startTime: new Date(gameSession.startTime).getTime(),
        finishTime,
        submitted: gameSession.submitted,
      };

      // Wrap the markSessionSubmitted function to return correct type
      const markSessionSubmittedWrapper = (
        gameCode: string
      ): GameSession | null => {
        const storedSession = markSessionSubmitted(gameCode, finishTime);
        if (!storedSession) return null;

        return {
          answers: Object.values(storedSession.answers).map((answer) => ({
            displayOrder: answer.displayOrder,
            answer: answer.answer,
            questionId: answer.questionId,
          })),
          startTime: new Date(storedSession.startTime).getTime(),
          finishTime: storedSession.submittedTime || finishTime,
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
          submittedTime: finishTime,
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

      if (!result.signature) {
        throw new Error('No signature returned from submission');
      }

      if (result.gameResult) {
        setGameResult(result.gameResult);
      }

      clearGameSession(gameCode);
      clearGameStartStatus(gameCode);
      return result.signature;
    } catch (error: any) {
      console.error('Error submitting game:', error);
      throw error;
    }
  };

  // Add useEffect to check if game can be ended
  useEffect(() => {
    if (gameData.status !== 'active' || !gameData || !isAdmin) return;

    const checkEndGameEligibility = () => {
      const now = Date.now();
      const endTime = new Date(gameData.end_time).getTime();
      const bufferTime = 30000; // 30 seconds after end_time

      if (now >= endTime + bufferTime) {
        setCanEndGame(true);
      }
    };

    const timer = setInterval(checkEndGameEligibility, 5000); // Check every 5 seconds
    checkEndGameEligibility(); // Initial check

    return () => clearInterval(timer);
  }, [gameData, isAdmin]);

  const handleEndGame = async () => {
    if (!program) throw new Error(t('Program not initialized'));
    if (!gameData) throw new Error('Game data not found');
    if (!publicKey) throw new Error(t('Please connect your wallet'));
    if (!sendTransaction)
      throw new Error(t('Wallet adapter not properly initialized'));
    if (!isAdmin) throw new Error(t('Only admin can end the game'));

    const now = Date.now();
    const endTime = new Date(gameData.end_time).getTime();
    const bufferTime = 30000; // 30 seconds buffer

    if (now < endTime + bufferTime) {
      throw new Error(
        t('Please wait 30 seconds after game end time before ending the game')
      );
    }

    try {
      const result = await endGameAndDeclareWinners(
        program,
        connection,
        publicKey,
        sendTransaction,
        {
          gameId: gameData.id,
          gameCode: gameData.game_code,
          isNative: gameData.is_native,
          vaultTokenAccount: gameData.is_native ? undefined : undefined, // Use actual vault token account
          adminTokenAccount: gameData.is_native ? undefined : undefined, // Use actual admin token account
          treasuryTokenAccount: gameData.is_native ? undefined : undefined, // Use actual treasury token account
        }
      );

      if (!result.success) {
        console.error('Failed to end game:', result.error);
        throw new Error(t('Failed to end game'));
      }
      console.log('Game end transaction successful');
      // Return the transaction signature
      return result.signature;
    } catch (error) {
      console.error('Error ending game:', error);
      throw error;
    }
  };

  // Event Listener for game end
  const winnersDeclaredEventListenerRef = React.useRef<number | null>(null);

  useEffect(() => {
    if (!program || !gameData || !connection) return;

    const setupGameEndedListener = async () => {
      try {
        const { gamePda } = deriveGamePDAs(
          program,
          new PublicKey(gameData.admin_wallet),
          gameData.game_code
        );

        const listener = program.addEventListener(
          'winnersDeclared',
          async (event) => {
            try {
              // @ts-ignore
              if (event.game.toString() === gamePda.toString()) {
                console.log('Game ended event received:', event);

                // Update game status and persist to localStorage
                setGameData((prev) => ({
                  ...prev,
                  status: 'ended',
                }));
                setGameEndedStatus(gameData.game_code);
              }
            } catch (error) {
              console.error('Error processing game end event:', error);
            }
          }
        );

        winnersDeclaredEventListenerRef.current = listener;
      } catch (error) {
        console.error('Error setting up GameEnded listener:', error);
      }
    };

    setupGameEndedListener();

    return () => {
      if (winnersDeclaredEventListenerRef.current !== null && program) {
        program.removeEventListener(winnersDeclaredEventListenerRef.current);
        winnersDeclaredEventListenerRef.current = null;
      }
    };
  }, [program, gameData, connection]);

  // Data fetching when game ends
  const RETRY_ATTEMPTS = 3;
  const RETRY_DELAY = 2000;
  useEffect(() => {
    if (!gameData?.game_code) return;

    const fetchGameResults = async (attempt = 1) => {
      try {
        setIsLoadingResults(true);
        setLoadError(null);

        // Prepare promises array
        const promises = [
          // Fetch updated game data
          supabase
            .from('games')
            .select('*')
            .eq('game_code', gameData.game_code)
            .single()
            .then(({ data, error }) => {
              if (error) throw error;
              return data;
            }),
          // Fetch game results using our utility
          fetchGameLeaderboard(gameData.id),
        ];

        // Add user result fetch if not admin
        if (!isAdmin && publicKey) {
          promises.push(fetchGameResult(gameData.id, publicKey.toString()));
        }

        // Get all results
        const [updatedGame, gameResults, userResult] = await Promise.all(
          promises
        );

        if (!gameResults) {
          throw new Error('Failed to fetch game results');
        }

        // Update game data with latest information
        setGameData((prev) => ({
          ...prev,
          ...updatedGame,
          status: 'ended',
        }));

        // Update user's game result if available
        setGameResult((prevResult) => ({
          ...(userResult || {}), // spread user's personal results if they exist
          winners: gameResults.winners,
          leaderboard: gameResults.allPlayers,
          // Ensure we maintain any existing result data
          ...(prevResult || {}),
        }));

        setIsLoadingResults(false);
      } catch (error) {
        console.error(
          `Error fetching game results (attempt ${attempt}):`,
          error
        );

        // Implement retry logic
        if (attempt < RETRY_ATTEMPTS) {
          setTimeout(() => {
            fetchGameResults(attempt + 1);
          }, RETRY_DELAY * attempt); // Exponential backoff
        } else {
          setIsLoadingResults(false);
          setLoadError(
            'Failed to load game results. Please try refreshing the page.'
          );
        }
      }
    };

    // Check if game is ended either from state or localStorage
    const isEnded =
      gameData.status === 'ended' || getGameEndedStatus(gameData.game_code);

    if (isEnded) {
      fetchGameResults();
    }

    // Check localStorage on mount
    if (!gameData.status && getGameEndedStatus(gameData.game_code)) {
      setGameData((prev) => ({
        ...prev,
        status: 'ended',
      }));
    }
  }, [gameData?.status, gameData?.game_code, gameData?.id, isAdmin, publicKey]);

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
        submitAnswer,
        getCurrentAnswer,
        getGameProgress,
        handleStartGame,
        handleSubmitAnswers,
        gameResult,
        handleEndGame,
        canEndGame,
        isLoadingResults,
        loadError,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export default GameContextProvider;
