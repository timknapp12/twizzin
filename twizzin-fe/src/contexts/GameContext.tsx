'use client';

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from 'react';
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
  submitAnswersCombined,
  clearGameSession,
  endGameAndDeclareWinners,
  fetchCompleteGameResults,
  setupPlayerResultSubscription,
  cleanupPlayerResultSubscription,
  supabase,
  fetchGameLeaderboard,
  GameState,
  getGameState,
  setGameState,
  fetchGamePlayers,
  fetchPlayerWithRetry,
  GamePlayer,
  clearGameState,
} from '@/utils';
import { useAppContext, useProgram } from '.';
import { PublicKey } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { BN } from '@coral-xyz/anchor';
import { recordPlayerJoinGame } from '@/utils/supabase/playerJoinGame';

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
  const { t, fetchUserXPAndRewards, userProfile } = useAppContext();
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
  // New state for game state management
  const [gameState, setGameStateInternal] = useState<GameState>(
    GameState.BROWSING
  );
  const [currentPlayers, setCurrentPlayers] = useState<GamePlayer[]>([]);
  const [rehydrationError, setRehydrationError] = useState<string | null>(null);

  if (currentPlayers.length > 0) {
    console.log('currentPlayers', currentPlayers);
  }

  const { program, provider } = useProgram();
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

      // Restore game state from localStorage if available
      const savedState = getGameState();
      if (savedState && savedState.gameCode === gameCode) {
        setGameStateInternal(savedState.state);
        // Defensive: If ACTIVE but no session, set error
        if (savedState.state === GameState.ACTIVE && !session) {
          setRehydrationError(
            t('Game session could not be restored. Please rejoin.')
          );
        } else {
          setRehydrationError(null);
        }
      } else {
        setGameStateInternal(GameState.JOINING);
        setRehydrationError(null);
      }
    } else {
      setGameStateInternal(GameState.BROWSING);
      clearGameState(); // Clear state when leaving a game
      setRehydrationError(null);
    }
  }, [gameCode, t]);

  // Add useEffect for fetching players when game code or partialGameData changes
  useEffect(() => {
    if (!gameCode || !partialGameData) return;

    const loadPlayers = async () => {
      try {
        const players = await fetchGamePlayers(gameCode);
        setCurrentPlayers(players);
      } catch (error) {}
    };

    loadPlayers();
  }, [gameCode, partialGameData]);

  // State transition validation
  const canTransitionTo = useCallback(
    (targetState: GameState): boolean => {
      // Define valid state transitions
      const validTransitions: Record<GameState, GameState[]> = {
        [GameState.BROWSING]: [GameState.JOINING],
        [GameState.JOINING]: [
          GameState.JOINED,
          GameState.BROWSING,
          GameState.ACTIVE,
        ],
        [GameState.JOINED]: [GameState.ACTIVE, GameState.BROWSING],
        [GameState.ACTIVE]: [GameState.SUBMITTED, GameState.ENDED],
        [GameState.SUBMITTED]: [GameState.ENDED],
        [GameState.ENDED]: [GameState.BROWSING],
      };

      return validTransitions[gameState].includes(targetState);
    },
    [gameState]
  );

  // Set game state with validation and persistence
  const setGameStateWithMetadata = useCallback(
    (state: GameState, metadata?: any) => {
      if (!gameCode) return;

      if (!canTransitionTo(state)) {
        console.warn(`Invalid state transition from ${gameState} to ${state}`);
        return;
      }

      // Update local state
      setGameStateInternal(state);

      // Persist to localStorage (single key)
      setGameState(gameCode, state, metadata);
    },
    [gameCode, gameState, canTransitionTo]
  );

  // useEffect handles isAdmin state based on wallet changes
  useEffect(() => {
    if (publicKey && partialGameData) {
      const isGameAdmin = Boolean(
        publicKey.toBase58() === partialGameData.admin_wallet
      );
      setIsAdmin(isGameAdmin);
    } else {
      setIsAdmin(false);
    }
  }, [publicKey, partialGameData]);

  const getGameByCode = async (code: string): Promise<Boolean> => {
    try {
      const game = await getPartialGameFromDb(code);
      setPartialGameData(game);
      setGameCode(game.game_code);

      // Check if current user is admin for this game
      const isGameAdmin = Boolean(
        publicKey && publicKey.toBase58() === game.admin_wallet
      );
      setIsAdmin(isGameAdmin);

      // If admin, get the full game data right away
      if (isGameAdmin) {
        const fullGame = await getGameFromDb(game.game_code);
        setGameData(fullGame);
        setGameStateInternal(GameState.JOINED);
        setGameState(game.game_code, GameState.JOINED, {}); // Overwrite state for new game
        return true;
      }

      // For regular players, set partial data and state only
      const savedState = getGameState();
      if (
        savedState &&
        savedState.gameCode === game.game_code &&
        savedState.state === GameState.JOINED
      ) {
        setGameStateWithMetadata(GameState.JOINED, {
          gameId: game.id,
          ...savedState.metadata,
        });
      } else {
        setGameStateWithMetadata(GameState.JOINING, { gameId: game.id });
      }
      return false;
    } catch (error) {
      console.error('Error fetching game:', error);
      throw error;
    }
  };

  // Add event listener cleanup ref
  const eventListenerRef = React.useRef<number | null>(null);
  const winnersDeclaredEventListenerRef = React.useRef<number | null>(null);
  const playerJoinedEventListenerRef = React.useRef<number | null>(null);
  const subscriptionRef = React.useRef(null);
  const hasSetupListenerRef = React.useRef(false);

  // Setup game start event listener for all users
  useEffect(() => {
    if (!program || !gameCode) return;

    const setupEventListener = async () => {
      try {
        // If we don't have partialGameData yet, we can't proceed
        if (!partialGameData) {
          console.log('[GameStart] Waiting for partialGameData...');
          return;
        }

        const { gamePda } = deriveGamePDAs(
          program,
          new PublicKey(partialGameData.admin_wallet),
          partialGameData.game_code
        );
        // Check if game is already active
        if (partialGameData.status === 'active') {
          console.log('[GameStart] Game is already active, updating state...');
          const fullGameData = await getGameFromDb(partialGameData.game_code);
          setGameData({
            ...fullGameData,
            status: 'active',
          });
          setGameStateInternal(GameState.ACTIVE);
          setGameStateWithMetadata(GameState.ACTIVE, {
            startTime: new Date(partialGameData.start_time).getTime(),
            endTime: new Date(partialGameData.end_time).getTime(),
          });
        }

        // Remove existing listener if it exists
        if (eventListenerRef.current !== null) {
          await program.removeEventListener(eventListenerRef.current);
        }

        console.log('[GameStart] Adding new gameStarted event listener...');
        const listener = program.addEventListener(
          'gameStarted',
          async (event: { game: PublicKey; startTime: BN; endTime: BN }) => {
            if (event.game.toString() === gamePda.toString()) {
              const actualStartTime = event.startTime.toNumber();
              const actualEndTime = event.endTime.toNumber();

              try {
                const fullGameData = await getGameFromDb(
                  partialGameData.game_code
                );
                setGameData({
                  ...fullGameData,
                  start_time: new Date(actualStartTime).toISOString(),
                  end_time: new Date(actualEndTime).toISOString(),
                  status: 'active',
                });

                setGameStateInternal(GameState.ACTIVE);
                setGameStateWithMetadata(GameState.ACTIVE, {
                  startTime: actualStartTime,
                  endTime: actualEndTime,
                });

                if (!gameSession) {
                  const newSession = initializeGameSession(
                    partialGameData.game_code,
                    gamePda.toString()
                  );
                  setGameSession(newSession);
                }
              } catch (error) {
                console.error('Error fetching full game data:', error);
              }
            }
          }
        );

        console.log(
          '[GameStart] Event listener setup complete, listener ID:',
          listener
        );
        eventListenerRef.current = listener;
        hasSetupListenerRef.current = true;
      } catch (error) {
        console.error(
          '[GameStart] Error setting up game start listener:',
          error
        );
      }
    };

    // If we haven't set up the listener yet, or if we have partialGameData now, try to set it up
    if (!hasSetupListenerRef.current || partialGameData) setupEventListener();

    return () => {
      if (eventListenerRef.current !== null && program) {
        program.removeEventListener(eventListenerRef.current);
        eventListenerRef.current = null;
        hasSetupListenerRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program, gameCode, partialGameData]); // Dependencies needed for PDA derivation and event listener setup

  // Setup player joined event listener
  useEffect(() => {
    if (!program || !connection || !partialGameData) return;

    const setupPlayerJoinedListener = async () => {
      try {
        const { gamePda } = deriveGamePDAs(
          program,
          new PublicKey(partialGameData.admin_wallet),
          partialGameData.game_code
        );

        // Remove existing listener if it exists
        if (playerJoinedEventListenerRef.current !== null) {
          await program.removeEventListener(
            playerJoinedEventListenerRef.current
          );
        }

        const listener = program.addEventListener(
          'playerJoined',
          async (event: {
            game: PublicKey;
            player: PublicKey;
            joinTime: BN;
          }) => {
            if (event.game.toString() === gamePda.toString()) {
              // Wait 5 seconds before fetching player data
              await new Promise((resolve) => setTimeout(resolve, 5000));

              try {
                const playerData = await fetchPlayerWithRetry(
                  partialGameData.id,
                  event.player.toString()
                );

                if (playerData) {
                  setCurrentPlayers((prev) => {
                    // Check if player already exists in the array
                    const playerExists = prev.some(
                      (p) => p.wallet_address === playerData.wallet_address
                    );
                    if (playerExists) {
                      console.log(
                        '[PlayerJoin] Player already exists in currentPlayers'
                      );
                      return prev;
                    }
                    const newPlayers = [...prev, playerData];
                    console.log('[PlayerJoin] New players array:', newPlayers);
                    return newPlayers;
                  });
                } else {
                  console.log(
                    '[PlayerJoin] No player data found for:',
                    event.player.toString()
                  );
                }
              } catch (error) {}
            }
          }
        );
        playerJoinedEventListenerRef.current = listener;
      } catch (error) {}
    };

    setupPlayerJoinedListener();

    return () => {
      if (playerJoinedEventListenerRef.current !== null && program) {
        program.removeEventListener(playerJoinedEventListenerRef.current);
        playerJoinedEventListenerRef.current = null;
      }
    };
  }, [program, connection, partialGameData]);

  const handleJoinGame = async (): Promise<string | null> => {
    if (!program || !provider) throw new Error(t('Please connect your wallet'));
    if (!publicKey) throw new Error(t('Please connect your wallet'));
    if (!sendTransaction)
      throw new Error(t('Wallet adapter not properly initialized'));
    if (!username) throw new Error(t('Username is required'));
    // Fetch partialGameData if not already set
    if (!partialGameData && gameCode) {
      await getGameByCode(gameCode);
    }

    if (!partialGameData) throw new Error('Game data not found');
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
        await program.account.playerAccount.fetch(playerPda);
        hasJoined = true;
      } catch (e: any) {
        if (!e.message.includes('does not exist')) {
          console.error('Error fetching playerAccount:', e);
          throw e;
        }
      }

      if (hasJoined || isAdmin) {
        // Update state to JOINED if we've already joined
        setGameStateWithMetadata(GameState.JOINED, {
          joinedAt: Date.now(),
          gamePda: gamePda.toString(),
        });

        // Also update the player's username in the database if needed
        if (username) {
          try {
            await recordPlayerJoinGame(
              partialGameData.id,
              publicKey.toString(),
              username
            );
          } catch (error) {
            console.error('Error updating player username:', error);
            // Don't throw here as the player is already joined
          }
        }

        return null;
      }

      const params: JoinGameParams = {
        gameCode: partialGameData.game_code,
        admin: new PublicKey(partialGameData.admin_wallet),
        tokenMint: new PublicKey(partialGameData.token_mint),
        entryFee: partialGameData.entry_fee,
        username: username,
      };

      const result = await joinGameCombined(program, provider, params);

      // Update game state to JOINED after successful join
      setGameStateWithMetadata(GameState.JOINED, {
        joinedAt: Date.now(),
        gamePda: gamePda.toString(),
      });

      return result.signature;
    } catch (error: any) {
      console.error('Error in handleJoinGame:', error);
      throw error;
    }
  };

  // For handleStartGame function (for admin)
  const handleStartGame = async () => {
    if (!program || !provider) throw new Error(t('Program not initialized'));
    if (!partialGameData) throw new Error('Game data not found');
    if (!publicKey) throw new Error(t('Please connect your wallet'));
    if (!sendTransaction)
      throw new Error(t('Wallet adapter not properly initialized'));

    // Calculate total time in milliseconds
    const totalTimeMs = calculateTotalTimeMs(
      partialGameData.start_time,
      partialGameData.end_time
    );
    // Validate the time calculation
    if (typeof totalTimeMs !== 'number' || isNaN(totalTimeMs)) {
      throw new Error('Invalid time calculation');
    }

    try {
      const result = await startGameCombined(program, provider, {
        gameId: partialGameData.id,
        gameCode: partialGameData.game_code,
        totalTimeMs,
      });

      if (result.success) {
        setGameData((prevGameData) => {
          if (prevGameData) {
            return { ...prevGameData, status: 'active' };
          }
          return prevGameData;
        });
        // Update game state to ACTIVE
        setGameStateWithMetadata(GameState.ACTIVE, {
          startTime: new Date(gameData.start_time).getTime(),
          endTime: new Date(gameData.end_time).getTime(),
          startedByAdmin: true,
          startedAt: Date.now(),
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
  const submitAnswer = (answer: GameAnswer): StoredGameSession | null => {
    if (!gameCode) return null;
    // Make sure we're always using the display letter
    const modifiedAnswer = {
      ...answer,
      answer: answer.displayLetter,
    };
    const result = saveGameAnswer(gameCode, modifiedAnswer);
    if (result) {
      setGameSession(result);
    }
    return result;
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
    if (!program || !provider || !gameSession || !gameData) {
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
        provider,
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

      // Update game state to SUBMITTED
      setGameStateWithMetadata(GameState.SUBMITTED, {
        submittedAt: finishTime,
        signature: result.signature,
      });

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
    if (!program || !provider) throw new Error(t('Program not initialized'));
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
      const result = await endGameAndDeclareWinners(program, provider, {
        gameId: gameData.id,
        gameCode: gameData.game_code,
        isNative: gameData.is_native,
        vaultTokenAccount: gameData.is_native ? undefined : undefined, // Use actual vault token account
        adminTokenAccount: gameData.is_native ? undefined : undefined, // Use actual admin token account
        treasuryTokenAccount: gameData.is_native ? undefined : undefined, // Use actual treasury token account
      });

      if (!result.success) {
        console.error('Failed to end game:', result.error);
        throw new Error(t('Failed to end game'));
      }
      // Update game state to ENDED
      setGameStateWithMetadata(GameState.ENDED, {
        endedAt: Date.now(),
        signature: result.signature,
      });
      fetchUserXPAndRewards();
      return result.signature;
    } catch (error) {
      console.error('Error ending game:', error);
      throw error;
    }
  };

  // Event Listener for game end
  useEffect(() => {
    // Validate all required dependencies are properly initialized
    if (
      !program ||
      !gameData ||
      !connection ||
      !gameData.admin_wallet ||
      !gameData.game_code
    ) {
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
                setGameData((prev) => ({
                  ...prev,
                  status: 'ended',
                }));

                // Update game state to ENDED
                setGameStateWithMetadata(GameState.ENDED, {
                  endedAt: Date.now(),
                  endedByEvent: true,
                });

                // Start listening for database updates if we're a player
                if (!isAdmin && publicKey) {
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
  }, [
    program,
    gameData,
    connection,
    isAdmin,
    publicKey,
    setGameStateWithMetadata,
  ]);

  useEffect(() => {
    // Early return if we don't have game code or ID
    if (!gameData?.game_code || !gameData?.id) return;

    // Check for stored state on mount or if status is undefined
    if (!gameData.status || gameData.status === '') {
      const savedState = getGameState();
      if (
        savedState &&
        savedState.gameCode === gameData.game_code &&
        savedState.state === GameState.ENDED
      ) {
        setGameData((prev) => ({
          ...prev,
          status: 'ended',
        }));
        return; // Exit early as the status change will trigger this effect again
      }
    }

    // Only run when the game has ended status
    const isEnded =
      gameData.status === 'ended' || gameState === GameState.ENDED;

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
    gameState,
  ]);

  // Cleanup player result subscription on component unmount
  useEffect(() => {
    return () => {
      clearGameState();
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
        gameState,
        setGameStateWithMetadata,
        canTransitionTo,
        gameSession,
        setGameSession,
        currentPlayers,
        rehydrationError,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export default GameContextProvider;
