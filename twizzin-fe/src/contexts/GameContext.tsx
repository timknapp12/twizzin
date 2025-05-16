'use client';

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
  useRef,
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
} from '@/utils';
import { useAppContext, useProgram } from '.';
import { PublicKey } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { BN } from '@coral-xyz/anchor';
import { recordPlayerJoinGame } from '@/utils/supabase/playerJoinGame';
import { useVerification } from '@/hooks/useVerification';

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
  const { withVerification, isVerified } = useVerification();
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
  const loadingRef = useRef(false);
  // New state for game state management
  const [gameState, setGameStateInternal] = useState<GameState>(
    GameState.BROWSING
  );

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
    console.log('Game code changed, checking session:', {
      gameCode,
      hasPublicKey: !!publicKey,
      isAdmin,
      hasPartialData: !!partialGameData
    });

    if (gameCode) {
      // First check if we have a saved state
      const savedState = getGameState(gameCode);
      console.log('Retrieved game state:', {
        hasSavedState: !!savedState,
        state: savedState?.state,
        timestamp: savedState?.timestamp
      });

      // Then check for a saved session
      const session = getGameSession(gameCode);
      console.log('Retrieved game session:', {
        hasSession: !!session,
        gameCode: session?.gameCode,
        hasAnswers: session ? Object.keys(session.answers).length : 0,
        submitted: session?.submitted
      });

      // If we have a saved state, restore it first
      if (savedState) {
        setGameStateInternal(savedState.state);
      }

      // If we have a session, restore it
      if (session) {
        setGameSession(session);
      }

      // If we have partial game data, we can proceed with loading
      if (partialGameData) {
        // If the game is active and we have a saved state, we're good
        if (partialGameData.status === 'active' && savedState?.state === GameState.ACTIVE) {
          return;
        }

        // If we're an admin and have a saved state, we're good
        if (isAdmin && savedState?.state === GameState.JOINED) {
          return;
        }

        // Otherwise, we need to load the game data
        getGameByCode(gameCode).catch(error => {
          console.error('Error loading game data:', error);
          setLoadError('Failed to load game data. Please try refreshing the page.');
        });
      } else {
        // If we don't have partial data, we need to load it
        getGameByCode(gameCode).catch(error => {
          console.error('Error loading game data:', error);
          setLoadError('Failed to load game data. Please try refreshing the page.');
        });
      }
    } else {
      console.log('No game code, setting to BROWSING');
      setGameStateInternal(GameState.BROWSING);
      setGameSession(null);
    }
  }, [gameCode, partialGameData, isAdmin, publicKey]);

  // State transition validation
  const canTransitionTo = useCallback(
    (targetState: GameState): boolean => {
      // Allow same-state transitions
      if (targetState === gameState) return true;

      // Define valid state transitions
      const validTransitions: Record<GameState, GameState[]> = {
        [GameState.BROWSING]: [GameState.JOINING],
        [GameState.JOINING]: [GameState.JOINED, GameState.BROWSING],
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

      // Persist to localStorage
      setGameState(gameCode, state, metadata);
    },
    [gameCode, gameState, canTransitionTo]
  );

  // useEffect handles isAdmin state based on wallet changes
  useEffect(() => {
    console.log('Admin state effect triggered:', {
      hasPublicKey: !!publicKey,
      hasPartialData: !!partialGameData,
      currentAdminState: isAdmin
    });

    if (publicKey && partialGameData) {
      const isGameAdmin = Boolean(
        publicKey.toBase58() === partialGameData.admin_wallet
      );
      console.log('Setting admin state:', {
        isGameAdmin,
        adminWallet: partialGameData.admin_wallet,
        currentWallet: publicKey.toBase58(),
        hasPartialData: true,
        previousAdminState: isAdmin
      });
      setIsAdmin(isGameAdmin);
    } else {
      console.log('Resetting admin state:', {
        hasPublicKey: !!publicKey,
        hasPartialData: !!partialGameData,
        previousAdminState: isAdmin
      });
      setIsAdmin(false);
    }
  }, [publicKey, partialGameData]);

  const getGameByCode = async (code: string): Promise<Boolean> => {
    console.log('getGameByCode called:', {
      code,
      isVerified,
      hasPublicKey: !!publicKey,
      hasPartialData: !!partialGameData,
      currentAdminState: isAdmin
    });

    // Prevent multiple simultaneous loads
    if (loadingRef.current) {
      console.log('Game data loading already in progress, skipping...');
      return false;
    }

    loadingRef.current = true;
    try {
      // First, ensure we have a verified wallet
      if (!isVerified) {
        console.log('Wallet not verified, attempting to verify...');
        const game = await getPartialGameFromDb(code, withVerification);
        if (!game) {
          console.error('Failed to verify wallet');
          loadingRef.current = false;
          return false;
        }
        console.log('Setting partial game data from verification:', {
          gameCode: game.game_code,
          adminWallet: game.admin_wallet
        });
        setPartialGameData(game);
      }

      // Now get the game data with verification
      const game = await withVerification(
        () => getPartialGameFromDb(code, withVerification),
        'Please verify your wallet to view game details'
      );
      
      if (!game) {
        console.error('No game data returned');
        loadingRef.current = false;
        return false;
      }
      
      console.log('Game data loaded:', {
        gameCode: game.game_code,
        adminWallet: game.admin_wallet,
        currentWallet: publicKey?.toBase58(),
        hasPublicKey: !!publicKey,
        gamePubkey: game.game_pubkey,
        status: game.status
      });
      
      // Set partial game data immediately
      console.log('Setting partial game data:', {
        gameCode: game.game_code,
        adminWallet: game.admin_wallet
      });
      setPartialGameData(game);
      setGameCode(game.game_code);
      
      // Verify on-chain state if we have a game pubkey
      if (game.game_pubkey && program) {
        try {
          // Validate the game_pubkey format - Solana public keys are base58 encoded and can be up to 88 characters
          if (!game.game_pubkey.match(/^[1-9A-HJ-NP-Za-km-z]{32,88}$/)) {
            console.error('Invalid game_pubkey format:', game.game_pubkey);
            loadingRef.current = false;
            return false;
          }

          const gamePda = new PublicKey(game.game_pubkey);
          // @ts-ignore
          const gameAccount = await program.account.game.fetch(gamePda);
          console.log('On-chain game state:', {
            gamePubkey: game.game_pubkey,
            status: gameAccount.status,
            admin: gameAccount.admin.toString(),
            gameCode: gameAccount.gameCode
          });

          // Verify the on-chain state matches our database state
          if (gameAccount.admin.toString() !== game.admin_wallet) {
            console.error('On-chain admin does not match database admin');
            loadingRef.current = false;
            return false;
          }
        } catch (err) {
          console.error('Error fetching on-chain game state:', err);
          // Don't fail the entire load if on-chain fetch fails
          console.log('Continuing without on-chain verification');
        }
      }

      // Check if current user is admin for this game
      if (!publicKey) {
        console.log('No public key available for admin check');
        setIsAdmin(false);
        loadingRef.current = false;
        return false;
      }

      const isGameAdmin = publicKey.toBase58() === game.admin_wallet;
      console.log('Admin check result:', {
        isGameAdmin,
        adminWallet: game.admin_wallet,
        currentWallet: publicKey.toBase58(),
        gamePubkey: game.game_pubkey,
        previousAdminState: isAdmin
      });
      setIsAdmin(isGameAdmin);

      // If admin, get the full game data right away
      if (isGameAdmin) {
        console.log('Loading full game data for admin');
        const fullGame = await withVerification(
          () => getGameFromDb(game.game_code, withVerification),
          'Please verify your wallet to view full game details'
        );
        if (fullGame) {
          console.log('Setting full game data:', {
            gameCode: fullGame.game_code,
            adminWallet: fullGame.admin_wallet,
            hasQuestions: !!fullGame.questions,
            status: fullGame.status
          });
          
          // Set the full game data first
          setGameData(fullGame);
          
          // Initialize game session if it doesn't exist and we have a program
          if (!gameSession && program) {
            const { gamePda } = deriveGamePDAs(
              program,
              new PublicKey(game.admin_wallet),
              game.game_code
            );
            const newSession = initializeGameSession(
              game.game_code,
              gamePda.toString()
            );
            setGameSession(newSession);
          }

          // Check current state before transitioning
          const currentState = getGameState(fullGame.game_code);
          const targetState = fullGame.status === 'active' ? GameState.ACTIVE : GameState.JOINED;

          // Only update state if it's different from current state
          if (!currentState || currentState.state !== targetState) {
            if (targetState === GameState.ACTIVE) {
              setGameStateWithMetadata(GameState.ACTIVE, {
                gameId: fullGame.id,
                startTime: new Date(fullGame.start_time).getTime(),
                endTime: new Date(fullGame.end_time).getTime(),
                isAdmin: true,
                joinedAt: Date.now()
              });
            } else {
              setGameStateWithMetadata(GameState.JOINED, {
                gameId: fullGame.id,
                isAdmin: true,
                joinedAt: Date.now()
              });
            }
            setGameStateInternal(targetState);
          }
          loadingRef.current = false;
          return true;
        }
      }

      // For regular players, check if game is already active
      if (game.status === 'active') {
        // If game is active, get the full game data first
        const fullGame = await withVerification(
          () => getGameFromDb(game.game_code, withVerification),
          'Please verify your wallet to view game details'
        );

        if (fullGame) {
          // Set the full game data
          setGameData(fullGame);

          // Initialize game session if it doesn't exist and we have a program
          if (!gameSession && program) {
            const { gamePda } = deriveGamePDAs(
              program,
              new PublicKey(game.admin_wallet),
              game.game_code
            );
            const newSession = initializeGameSession(
              game.game_code,
              gamePda.toString()
            );
            setGameSession(newSession);
          }

          // Check current state before transitioning
          const currentState = getGameState(fullGame.game_code);
          if (!currentState || currentState.state !== GameState.ACTIVE) {
            // Set state to ACTIVE with proper metadata
            setGameStateWithMetadata(GameState.ACTIVE, {
              gameId: game.id,
              startTime: new Date(fullGame.start_time).getTime(),
              endTime: new Date(fullGame.end_time).getTime(),
              joinedActiveGame: true,
              joinedAt: Date.now()
            });
            setGameStateInternal(GameState.ACTIVE);
          }
        }
        loadingRef.current = false;
        return true;
      }

      // For regular players joining a non-active game
      const savedState = getGameState(game.game_code);
      if (savedState && savedState.state === GameState.JOINED) {
        setGameStateWithMetadata(GameState.JOINED, { gameId: game.id, ...savedState.metadata });
      } else {
        setGameStateWithMetadata(GameState.JOINING, { gameId: game.id });
      }
      loadingRef.current = false;
      return true;
    } catch (error) {
      console.error('Error fetching game:', error);
      loadingRef.current = false;
      throw error;
    }
  };

  // Add event listener cleanup ref
  const eventListenerRef = React.useRef<number | null>(null);

  // Setup game start event listener for all users
  useEffect(() => {
    if (!program || !connection || !partialGameData) return;

    const setupEventListener = async () => {
      try {
        const { gamePda } = deriveGamePDAs(
          program,
          new PublicKey(partialGameData.admin_wallet),
          partialGameData.game_code
        );

        // Remove existing listener if it exists
        if (eventListenerRef.current !== null) {
          await program.removeEventListener(eventListenerRef.current);
        }

        const listener = program.addEventListener(
          'gameStarted',
          async (event: { game: PublicKey; startTime: BN; endTime: BN }) => {
            if (event.game.toString() === gamePda.toString()) {
              const actualStartTime = event.startTime.toNumber();
              const actualEndTime = event.endTime.toNumber();

              try {
                const fullGameData = await getGameFromDb(
                  partialGameData.game_code,
                  withVerification
                );

                // Update game data first
                setGameData({
                  ...fullGameData,
                  start_time: new Date(actualStartTime).toISOString(),
                  end_time: new Date(actualEndTime).toISOString(),
                  status: 'active',
                });

                // Initialize game session if it doesn't exist
                if (!gameSession) {
                  const newSession = initializeGameSession(
                    partialGameData.game_code,
                    gamePda.toString()
                  );
                  setGameSession(newSession);
                }

                // Update game state last to ensure all data is ready
                setGameStateWithMetadata(GameState.ACTIVE, {
                  startTime: actualStartTime,
                  endTime: actualEndTime,
                  startedByEvent: true,
                  startedAt: Date.now(),
                });

                // Force a re-render by updating a state
                setGameStateInternal(GameState.ACTIVE);
              } catch (error) {
                console.error('Error fetching full game data:', error);
              }
            }
          }
        );

        eventListenerRef.current = listener;
      } catch (error) {
        console.error('Error setting up game start listener:', error);
      }
    };

    setupEventListener();

    return () => {
      if (eventListenerRef.current !== null && program) {
        program.removeEventListener(eventListenerRef.current);
        eventListenerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program, connection, partialGameData]);

  const handleJoinGame = async (): Promise<string | null> => {
    if (!program) throw new Error(t('Program not initialized'));
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
              withVerification,
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

      const result = await joinGameCombined(
        program,
        connection,
        publicKey,
        sendTransaction,
        params,
        withVerification
      );

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
    if (!program) throw new Error(t('Program not initialized'));
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
      const result = await startGameCombined(
        program,
        connection,
        publicKey,
        sendTransaction,
        {
          gameId: partialGameData.id,
          gameCode: partialGameData.game_code,
          totalTimeMs,
        }
      );

      if (result.success) {
        // Update game data first
        setGameData((prevGameData) => {
          if (prevGameData) {
            return { 
              ...prevGameData, 
              status: 'active',
              start_time: new Date().toISOString(),
              end_time: new Date(Date.now() + totalTimeMs).toISOString()
            };
          }
          return prevGameData;
        });

        // Initialize game session if it doesn't exist
        if (!gameSession) {
          const { gamePda } = deriveGamePDAs(
            program,
            new PublicKey(partialGameData.admin_wallet),
            partialGameData.game_code
          );
          const newSession = initializeGameSession(
            partialGameData.game_code,
            gamePda.toString()
          );
          setGameSession(newSession);
        }

        // Update game state last to ensure all data is ready
        setGameStateWithMetadata(GameState.ACTIVE, {
          startTime: Date.now(),
          endTime: Date.now() + totalTimeMs,
          startedByAdmin: true,
          startedAt: Date.now(),
        });

        // Force a re-render by updating a state
        setGameStateInternal(GameState.ACTIVE);
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

  const loadCompleteResults = async () => {
    if (!gameData?.id || !gameData?.game_code) return;

    setIsLoadingResults(true);
    setLoadError(null);

    try {
      if (isAdmin) {
        // Admin flow
        const results = await withVerification(
          () => fetchCompleteGameResults(
            gameData.id,
            gameData.game_code,
            publicKey?.toString(),
            withVerification
          ),
          'Please verify your wallet to view game results'
        );

        if (results) {
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
        }
      } else {
        // Regular player flow
        const results = await withVerification(
          () => fetchCompleteGameResults(
            gameData.id,
            gameData.game_code,
            publicKey?.toString(),
            withVerification
          ),
          'Please verify your wallet to view game results'
        );

        if (results) {
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
      }
    } catch (error) {
      console.error('Error loading complete game results:', error);
      setLoadError(
        'Failed to load game results. Please try refreshing the page.'
      );
      setIsLoadingResults(false);
    }
  };

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
        gameState,
        setGameStateWithMetadata,
        canTransitionTo,
        gameSession,
        setGameSession,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export default GameContextProvider;
