'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Tabs,
  Tab,
  ScreenContainer,
  InnerScreenContainer,
  Button,
  Column,
  Row,
  Label,
} from '@/components';
import { FaSpinner } from 'react-icons/fa6';
import { Header } from '@/components/Header';
import {
  useGameContext,
  useAppContext,
  useCreateGameContext,
} from '@/contexts';
import DisplayAddedGame from '@/components/Create/DisplayAddedGame';
import AddUpdateGame from '@/components/Create/AddUpdateGame';
import { GameState, getGameFromDb, getRemainingTime } from '@/utils';
import { JoinFullGame, QuestionFromDb, QuestionForDb } from '@/types';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { toast } from 'react-toastify';
import PlayGame from '@/components/Game/PlayGame';
import PlayerGameResults from '@/components/Game/PlayerGameResults';

export const CreatorGameComponent = () => {
  const params = useParams();
  const gameCode = params.gameCode;
  const hasUpdatedContextRef = useRef(false);
  const {
    getGameByCode,
    gameData: contextGameData,
    gameState,
    gameResult,
    isAdmin,
    handleStartGame,
  } = useGameContext();
  const { t } = useAppContext();

  // Get access to the CreateGameContext for edit mode
  const { handleBulkQuestionUpdate, handleGameData, resetForm } =
    useCreateGameContext();

  const TABS = {
    DETAILS: t('Game Details'),
    EDIT: t('Edit Game'),
    PLAY: t('Play Game'),
    RESULTS: t('Results'),
    PLAYERS: t('Players'),
  };

  const [activeTab, setActiveTab] = useState(TABS.DETAILS);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [gameData, setGameData] = useState<JoinFullGame | null>(null);
  const [questions, setQuestions] = useState<QuestionForDb[]>([]);
  const [isStartingGame, setIsStartingGame] = useState(false);

  const [countdown, setCountdown] = useState<string>(
    getRemainingTime(gameData?.start_time || '')
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getRemainingTime(gameData?.start_time || ''));
    }, 1000);

    return () => clearInterval(timer);
  }, [gameData?.start_time]);

  useEffect(() => {
    setIsMounted(true);
    // Reset form state when component mounts
    resetForm();
  }, [resetForm]);

  // Format DB questions for component state
  const formatQuestionsForState = useCallback(
    (dbQuestions: QuestionFromDb[]): QuestionForDb[] => {
      return (dbQuestions || []).map((q: QuestionFromDb) => ({
        id: q.id,
        displayOrder: q.display_order,
        questionText: q.question_text,
        correctAnswer: q.correct_answer,
        timeLimit: q.time_limit,
        answers: q.answers.map((a) => ({
          answerText: a.answer_text,
          displayLetter: a.display_letter,
          displayOrder: a.display_order,
          isCorrect: a.is_correct,
        })),
      }));
    },
    []
  );

  // Format DB game data for component state
  const formatGameDataForForm = useCallback((dbGameData: JoinFullGame) => {
    return {
      gameName: dbGameData.name,
      entryFee: dbGameData.entry_fee / LAMPORTS_PER_SOL,
      startTime: new Date(dbGameData.start_time),
      commission: dbGameData.commission_bps / 100,
      donation: dbGameData.donation_amount / LAMPORTS_PER_SOL,
      maxWinners: dbGameData.max_winners,
      evenSplit: dbGameData.even_split,
      allAreWinners: dbGameData.all_are_winners,
      username: dbGameData.username || '',
      gameCode: dbGameData.game_code,
    };
  }, []);

  // Update CreateGameContext with DB data
  const updateCreateGameContext = useCallback(
    (dbGameData: JoinFullGame) => {
      // Format game data for context
      const formattedGameData = formatGameDataForForm(dbGameData);

      // Update each field in context
      Object.entries(formattedGameData).forEach(([key, value]) => {
        handleGameData({
          target: {
            name: key,
            value,
            type: typeof value === 'boolean' ? 'checkbox' : 'text',
          },
        } as any);
      });

      // Update questions in context
      const formattedQuestions = formatQuestionsForState(dbGameData.questions);
      handleBulkQuestionUpdate(formattedQuestions);
    },
    [
      handleGameData,
      handleBulkQuestionUpdate,
      formatGameDataForForm,
      formatQuestionsForState,
    ]
  );

  // Fetch fresh game data from DB
  const fetchFreshGameData = useCallback(async () => {
    if (!gameCode) return;

    setIsRefreshing(true);
    try {
      // Always fetch fresh from database
      const freshGameData = await getGameFromDb(gameCode as string);

      if (!freshGameData) {
        toast.error(t('Game not found'));
        return null;
      }

      // Update local state
      setGameData(freshGameData);
      setQuestions(formatQuestionsForState(freshGameData.questions));

      // Update context for edit mode
      updateCreateGameContext(freshGameData);

      // Also update game context
      getGameByCode(gameCode.toString());

      return freshGameData;
    } catch (err: unknown) {
      console.error('Error refreshing game data:', err);
      if (err instanceof Error) {
        toast.error(`${t('Error refreshing game data')}: ${err.message}`);
      }
      return null;
    } finally {
      setIsRefreshing(false);
    }
  }, [
    gameCode,
    t,
    getGameByCode,
    formatQuestionsForState,
    updateCreateGameContext,
  ]);

  // Function to handle switch from edit to details
  const handleSwitchToDetails = useCallback(async () => {
    // First refresh data from DB to get latest state
    await fetchFreshGameData();
    // Then switch to details tab
    setActiveTab(TABS.DETAILS);
  }, [fetchFreshGameData, TABS.DETAILS]);

  // Fetch game data when component mounts
  useEffect(() => {
    if (!gameCode || !isMounted) return;

    const fetchGameData = async () => {
      setIsLoading(true);
      setError('');

      try {
        // First try to get from context if available
        if (contextGameData && contextGameData.game_code === gameCode) {
          setGameData(contextGameData);
          const formattedQuestions = formatQuestionsForState(
            contextGameData.questions
          );
          setQuestions(formattedQuestions);

          // Also update the CreateGameContext for edit mode - CAREFUL HERE!
          // This might be causing the loop
          if (!hasUpdatedContextRef.current) {
            updateCreateGameContext(contextGameData);
            hasUpdatedContextRef.current = true;
          }
        } else {
          // Otherwise fetch from database
          await fetchFreshGameData();
        }
      } catch (err: unknown) {
        console.error('Error fetching game data:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load game data'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchGameData();
    // Only include stable dependencies here:
  }, [gameCode, isMounted, contextGameData?.game_code]);

  const getVisibleTabs = () => {
    const tabs = [TABS.DETAILS];
    // Edit tab available to admin only when game is not ended
    if (gameState !== GameState.ENDED && gameData?.status !== 'ended') {
      tabs.push(TABS.EDIT);
    }
    // Show Play tab when game is active
    if (gameData?.status === 'active' || gameState === GameState.ACTIVE) {
      tabs.push(TABS.PLAY);
    }
    // Show Results tab when game has ended or results exist
    if (
      gameData?.status === 'ended' ||
      gameState === GameState.ENDED ||
      gameResult
    ) {
      tabs.push(TABS.RESULTS);
    }
    // Players tab always available
    tabs.push(TABS.PLAYERS);

    return tabs;
  };

  const countDownText =
    countdown === 'Game has started!' && isAdmin
      ? t('The game is ready for you to start it')
      : countdown === 'Game has started!'
      ? t('Waiting for admin to start game...')
      : countdown;

  const onStartGame = async () => {
    setIsStartingGame(true);
    try {
      await handleStartGame();
      toast.success(t('Game started successfully'));
      setActiveTab(TABS.PLAY);
    } catch (error: unknown) {
      console.error('Error starting game:', error);
      if (error instanceof Error) {
        toast.error(`${t('Error starting game')}: ${error.message}`);
      } else {
        toast.error(t('Error starting game'));
      }
    } finally {
      setIsStartingGame(false);
    }
  };

  const errorColor = 'var(--color-error)';

  if (!isMounted) {
    return <LoadingPlaceholder />;
  }

  if (isLoading) {
    return <LoadingPlaceholder />;
  }

  if (error) {
    return <ErrorDisplay message={error} />;
  }

  if (!gameData) {
    return <ErrorDisplay message={t('Game not found')} />;
  }

  return (
    <ScreenContainer>
      <Header />
      <InnerScreenContainer>
        <div
          className='flex-grow flex flex-col items-center w-full'
          style={{ marginTop: '3vh' }}
        >
          {isRefreshing && (
            <Row className='w-full justify-center mb-2'>
              <FaSpinner className='animate-spin' size={16} />
              <span className='ml-2'>{t('Refreshing game data...')}</span>
            </Row>
          )}

          <Tabs activeTab={activeTab} onChange={setActiveTab}>
            {getVisibleTabs().map((tab) => (
              <Tab key={tab} id={tab} label={tab}>
                {tab === TABS.DETAILS && (
                  <>
                    {/* Add countdown timer */}
                    <Row className='gap-2 mb-4'>
                      {countdown === 'Game has started!' ? null : (
                        <Label>{t('Time till game starts')}:</Label>
                      )}
                      <Label style={{ color: errorColor }}>
                        {countDownText}
                      </Label>
                    </Row>

                    <DisplayAddedGame
                      gameData={{
                        gameName: gameData.name,
                        entryFee: gameData.entry_fee / LAMPORTS_PER_SOL,
                        startTime: new Date(gameData.start_time),
                        commission: gameData.commission_bps / 100,
                        donation: gameData.donation_amount / LAMPORTS_PER_SOL,
                        maxWinners: gameData.max_winners,
                        evenSplit: gameData.even_split,
                        allAreWinners: gameData.all_are_winners,
                        username: gameData.username || '',
                        gameCode: gameData.game_code,
                      }}
                      questions={questions}
                      setIsEdit={() => setActiveTab(TABS.EDIT)}
                    />

                    {/* Add start game button if admin and game not started */}
                    {isAdmin && gameState !== GameState.ACTIVE && (
                      <Row justify='center' className='mt-6'>
                        <Button
                          onClick={onStartGame}
                          isLoading={isStartingGame}
                        >
                          {t('Start Game')}
                        </Button>
                      </Row>
                    )}
                  </>
                )}
                {tab === TABS.EDIT && (
                  <AddUpdateGame
                    gameCode={gameData.game_code}
                    setIsDisplayGame={handleSwitchToDetails}
                  />
                )}
                {tab === TABS.PLAY && (
                  <PlayGame goToResults={() => setActiveTab(TABS.RESULTS)} />
                )}
                {tab === TABS.RESULTS && <PlayerGameResults />}
                {tab === TABS.PLAYERS && (
                  <PlayersList gameCode={gameData.game_code} />
                )}
              </Tab>
            ))}
          </Tabs>
        </div>
      </InnerScreenContainer>
    </ScreenContainer>
  );
};

// Helper components
const LoadingPlaceholder = () => {
  const { t } = useAppContext();
  return (
    <ScreenContainer>
      <Header />
      <InnerScreenContainer>
        <div
          className='flex-grow flex flex-col items-center w-full'
          style={{ marginTop: '3vh' }}
        >
          <Column className='w-full h-64 items-center justify-center'>
            <FaSpinner className='animate-spin' size={28} />
            <div className='mt-4'>{t('Loading game data...')}</div>
          </Column>
        </div>
      </InnerScreenContainer>
    </ScreenContainer>
  );
};

const ErrorDisplay = ({ message }: { message: string }) => {
  const { t } = useAppContext();
  const router = useRouter();
  return (
    <ScreenContainer>
      <Header />
      <InnerScreenContainer>
        <div
          className='flex-grow flex flex-col items-center w-full'
          style={{ marginTop: '3vh' }}
        >
          <Column className='w-full h-64 items-center justify-center'>
            <div className='text-red-500 text-xl mb-4'>Error</div>
            <div>{message}</div>
            <Button className='mt-6' onClick={() => router.back()}>
              {t('Back')}
            </Button>
          </Column>
        </div>
      </InnerScreenContainer>
    </ScreenContainer>
  );
};

const PlayersList = ({ gameCode }: { gameCode: string }) => {
  console.log('gameCode', gameCode);
  // This would fetch and display players who have joined the game
  return (
    <Column className='w-full p-4'>
      <h2 className='text-xl mb-4'>Players</h2>
      <div className='text-center'>Player management coming soon</div>
    </Column>
  );
};
