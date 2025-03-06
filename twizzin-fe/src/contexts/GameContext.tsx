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
  fetchCompleteGameResults,
  setGameEndedStatus,
  setupPlayerResultSubscription,
  cleanupPlayerResultSubscription,
  supabase,
  fetchGameLeaderboard,
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
  const { t, language, fetchUserXPAndRewards, userProfile } = useAppContext();
  const [username, setUsername] = useState('');
  const [gameCode, setGameCode] = useState('');
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

  useEffect(() => {
    if (userProfile?.username) {
      setUsername(userProfile.username);
    }
  }, [userProfile?.username]);

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
    if (!program) throw new Error(t('Please connect your wallet'));
    if (!partialGameData) throw new Error('Game data not found');
    if (!publicKey) throw new Error(t('Please connect your wallet'));
    if (!sendTransaction)
      throw new Error(t('Wallet adapter not properly initialized'));
    if (!username) throw new Error(t('Username is required'));
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
        username: username,
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
    // Make sure we're always using the display letter
    const modifiedAnswer = {
      ...answer,
      answer: answer.displayLetter,
    };
    const updatedSession = saveGameAnswer(gameCode, modifiedAnswer);
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
      answer: fullAnswer.display_letter, // Use display letter
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
        // Get the game result returned from submission
        const gameResult = result.gameResult;

        // Update the gameResult with user answers from gameSession before setting state
        if (
          gameResult.answeredQuestions &&
          gameResult.answeredQuestions.length > 0
        ) {
          // Create a map of answers from the gameSession for quick lookup
          const sessionAnswers = Object.values(gameSession.answers).reduce<
            Record<string, (typeof gameSession.answers)[number]>
          >((map, answer) => {
            map[answer.questionId] = answer;
            return map;
          }, {});

          // For each question in the result, set the user answer if it's missing
          const updatedQuestions = gameResult.answeredQuestions.map(
            (question) => {
              // If question already has a userAnswer, keep it
              if (question.userAnswer) return question;

              // Get user's answer from session
              const userSessionAnswer = sessionAnswers[question.questionId];

              if (!userSessionAnswer) return question;

              // Find the matching answer in the game data
              const questionData = gameData.questions.find(
                (q) => q.id === question.questionId
              );
              const answerData = questionData?.answers.find(
                (a) => a.display_letter === userSessionAnswer.answer
              );

              if (!answerData) return question;

              // Return updated question with user answer
              return {
                ...question,
                userAnswer: {
                  text: answerData.answer_text,
                  displayLetter: answerData.display_letter,
                },
              };
            }
          );

          setGameResult({
            ...gameResult,
            answeredQuestions: updatedQuestions,
          });
        } else {
          setGameResult(gameResult);
        }
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
      fetchUserXPAndRewards();
      // Return the transaction signature
      return result.signature;
    } catch (error) {
      console.error('Error ending game:', error);
      throw error;
    }
  };

  // Event Listener for game end
  const winnersDeclaredEventListenerRef = React.useRef<number | null>(null);
  const subscriptionRef = React.useRef(null);
  useEffect(() => {
    // Validate all required dependencies are properly initialized
    if (
      !program ||
      !gameData ||
      !connection ||
      !gameData.admin_wallet ||
      !gameData.game_code
    ) {
      console.log('Missing required dependencies for game end listener');
      return;
    }

    const setupGameEndedListener = async () => {
      try {
        // Validate admin wallet is a valid public key
        let adminWallet: PublicKey;
        try {
          adminWallet = new PublicKey(gameData.admin_wallet);
        } catch (error) {
          console.error('Invalid admin wallet address:', error);
          return;
        }

        // Get game PDA
        const { gamePda } = deriveGamePDAs(
          program,
          adminWallet,
          gameData.game_code
        );

        if (!gamePda) {
          console.error('Failed to derive game PDA');
          return;
        }

        const listener = program.addEventListener(
          'winnersDeclared',
          async (event: any) => {
            // Explicitly type as any since we're using @ts-ignore
            try {
              // Validate event structure
              if (!event || !event.game) {
                console.error('Invalid event structure:', event);
                return;
              }

              const eventGameAddress = event.game.toString();
              const expectedGameAddress = gamePda.toString();

              if (eventGameAddress === expectedGameAddress) {
                console.log('Game ended event received:', event);

                // Update game status and persist to localStorage
                setGameData((prev) => ({
                  ...prev,
                  status: 'ended',
                }));
                setGameEndedStatus(gameData.game_code);

                // Start listening for database updates if we're a player
                if (!isAdmin && publicKey) {
                  console.log(
                    'Setting up database subscription for updates...'
                  );
                  setupPlayerResultSubscription(
                    gameData.id,
                    publicKey.toString(),
                    subscriptionRef,
                    setGameResult
                  );
                }
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

    // Cleanup function
    return () => {
      if (winnersDeclaredEventListenerRef.current !== null && program) {
        try {
          program.removeEventListener(winnersDeclaredEventListenerRef.current);
        } catch (error) {
          console.error('Error removing event listener:', error);
        } finally {
          winnersDeclaredEventListenerRef.current = null;
        }
      }
    };
  }, [program, gameData, connection, isAdmin, publicKey]);

  useEffect(() => {
    // Early return if we don't have game code or ID
    if (!gameData?.game_code || !gameData?.id) return;

    // Check localStorage on mount or if status is undefined
    if (!gameData.status || gameData.status === '') {
      const isEndedInStorage = getGameEndedStatus(gameData.game_code);
      if (isEndedInStorage) {
        setGameData((prev) => ({
          ...prev,
          status: 'ended',
        }));
        return; // Exit early as the status change will trigger this effect again
      }
    }

    // Only run when the game has ended status
    const isEnded =
      gameData.status === 'ended' || getGameEndedStatus(gameData.game_code);
    if (!isEnded) return;

    const loadCompleteResults = async () => {
      try {
        setIsLoadingResults(true);
        setLoadError(null);

        // Different approach for admin vs player
        if (isAdmin) {
          try {
            // For admins, fetch game data and leaderboard info directly
            const [gameDataResult, leaderboardResults] = await Promise.all([
              supabase
                .from('games')
                .select('*')
                .eq('id', gameData.id)
                .single()
                .then(({ data }) => data),
              fetchGameLeaderboard(gameData.id),
            ]);

            // Update game data with latest information
            setGameData((prev) => ({
              ...prev,
              ...(gameDataResult || {}),
              status: 'ended',
            }));

            // Set game result with leaderboard data only for admins
            setGameResult({
              winners: leaderboardResults?.winners || [],
              leaderboard: leaderboardResults?.allPlayers || [],
              totalCorrect: 0,
              totalQuestions: gameData.questions?.length || 0,
              answeredQuestions: [],
              completedAt: null,
            });

            console.log('Admin game results loaded:', {
              gameData: gameDataResult,
              winners: leaderboardResults?.winners?.length || 0,
              leaderboard: leaderboardResults?.allPlayers?.length || 0,
            });
          } catch (adminError) {
            console.error('Error loading admin results:', adminError);
            setLoadError('Failed to load game results. Please try refreshing.');
          }
        } else {
          // Regular player flow
          const results = await fetchCompleteGameResults(
            gameData.id,
            gameData.game_code,
            publicKey?.toString()
          );

          // Update game data with latest information
          setGameData((prev) => ({
            ...prev,
            ...results.gameData,
            status: 'ended',
          }));

          // Update game result with complete data
          setGameResult((prevResult) => {
            if (!results.playerResult) return prevResult;
            return {
              ...(prevResult || {}),
              ...results.playerResult,
              winners: results.winners,
              leaderboard: results.leaderboard,
            } as GameResultFromDb;
          });

          // Set up subscription if we're a player and XP/rank data isn't available yet
          if (publicKey && results.playerResult) {
            if (
              results.playerResult.xpEarned === undefined ||
              results.playerResult.xpEarned === 0 ||
              results.playerResult.finalRank === null ||
              results.playerResult.finalRank === undefined
            ) {
              setupPlayerResultSubscription(
                gameData.id,
                publicKey.toString(),
                subscriptionRef,
                setGameResult
              );
            }
          }
        }

        setIsLoadingResults(false);
        fetchUserXPAndRewards();
      } catch (error) {
        console.error('Error loading complete game results:', error);
        setLoadError(
          'Failed to load game results. Please try refreshing the page.'
        );
        setIsLoadingResults(false);
      }
    };
    // Kick off the data loading
    loadCompleteResults();
  }, [
    gameData?.status,
    gameData?.game_code,
    gameData?.id,
    publicKey,
    fetchUserXPAndRewards,
    gameData?.questions,
    isAdmin,
  ]);

  // Cleanup player result subscription on component unmount
  useEffect(() => {
    return () => {
      cleanupPlayerResultSubscription(subscriptionRef);
    };
  }, []);

  return (
    <GameContext.Provider
      value={{
        username,
        setUsername,
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
