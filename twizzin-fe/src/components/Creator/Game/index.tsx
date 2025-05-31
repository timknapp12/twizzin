'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
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
import Link from 'next/link';
import { MainSkeleton } from '@/components/MainSkeleton';
import PlayersList from './PlayersList';

export const CreatorGameComponent = () => {
  const params = useParams();
  const gameCode = params.gameCode as string;
  const { publicKey } = useWallet();
  const {
    getGameByCode,
    gameData: contextGameData,
    gameState,
    gameResult,
    isAdmin,
    handleStartGame,
    partialGameData,
  } = useGameContext();
  const { t } = useAppContext();
  const { handleBulkQuestionUpdate, handleGameData } = useCreateGameContext();

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

  // Initial data fetch with admin check
  useEffect(() => {
    if (!gameCode || !isMounted || !publicKey || !partialGameData) {
      setIsLoading(false);
      return;
    }

    const isGameAdmin = Boolean(
      publicKey.toBase58() === partialGameData.admin_wallet
    );

    if (!isGameAdmin) {
      setIsLoading(false); // Stop loading if not admin
      return;
    }

    const fetchGameData = async () => {
      setIsLoading(true);
      setError('');
      try {
        await getGameByCode(gameCode);
        if (contextGameData && contextGameData.game_code === gameCode) {
          setGameData(contextGameData);
          const formattedQuestions = formatQuestionsForState(
            contextGameData.questions
          );
          setQuestions(formattedQuestions);
          updateCreateGameContext(contextGameData);
        }
      } catch (err) {
        console.error('Error fetching game data:', err);
        setError(
          err instanceof Error ? err.message : t('Failed to load game data')
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchGameData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameCode, isMounted, publicKey]);

  // Fetch partial data to determine admin status if not already present
  useEffect(() => {
    if (!gameCode || !isMounted || partialGameData) return;

    const fetchInitialData = async () => {
      try {
        await getGameByCode(gameCode);
      } catch (err) {
        console.error('Error fetching initial game data:', err);
        setError(
          err instanceof Error ? err.message : t('Failed to load game data')
        );
      }
    };

    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameCode, isMounted, partialGameData]);

  useEffect(() => {
    if (!gameData?.start_time) return;
    const timer = setInterval(() => {
      setCountdown(getRemainingTime(gameData?.start_time || ''));
    }, 1000);
    return () => clearInterval(timer);
  }, [gameData?.start_time]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  const updateCreateGameContext = useCallback(
    (dbGameData: JoinFullGame) => {
      const formattedGameData = formatGameDataForForm(dbGameData);
      Object.entries(formattedGameData).forEach(([key, value]) => {
        handleGameData({
          target: {
            name: key,
            value,
            type: typeof value === 'boolean' ? 'checkbox' : 'text',
          },
        } as any);
      });
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

  const fetchFreshGameData = useCallback(async () => {
    if (!gameCode || !isAdmin) return;
    setIsRefreshing(true);
    try {
      const freshGameData = await getGameFromDb(gameCode);
      if (!freshGameData) {
        toast.error(t('Game not found'));
        return null;
      }
      setGameData(freshGameData);
      setQuestions(formatQuestionsForState(freshGameData.questions));
      updateCreateGameContext(freshGameData);
      return freshGameData;
    } catch (err) {
      console.error('Error refreshing game data:', err);
      toast.error(
        err instanceof Error
          ? `${t('Error refreshing game data')}: ${err.message}`
          : t('Error refreshing game data')
      );
      return null;
    } finally {
      setIsRefreshing(false);
    }
  }, [gameCode, t, formatQuestionsForState, updateCreateGameContext, isAdmin]);

  const handleSwitchToDetails = useCallback(async () => {
    await fetchFreshGameData();
    setActiveTab(TABS.DETAILS);
  }, [fetchFreshGameData, TABS.DETAILS]);

  useEffect(() => {
    if (!gameCode || !isMounted || !isAdmin) return;
    const fetchGameData = async () => {
      // setIsLoading(true);
      // setError('');
      try {
        if (contextGameData && contextGameData.game_code === gameCode) {
          setGameData(contextGameData);
          const formattedQuestions = formatQuestionsForState(
            contextGameData.questions
          );
          setQuestions(formattedQuestions);
          updateCreateGameContext(contextGameData);
        } else {
          await fetchFreshGameData();
        }
      } catch (err) {
        console.error('Error fetching game data:', err);
        setError(
          err instanceof Error ? err.message : t('Failed to load game data')
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchGameData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameCode, isMounted, isAdmin]);

  const getVisibleTabs = () => {
    const tabs = [TABS.DETAILS];
    if (gameState !== GameState.ENDED && gameData?.status !== 'ended') {
      tabs.push(TABS.EDIT);
    }
    if (gameData?.status === 'active' || gameState === GameState.ACTIVE) {
      tabs.push(TABS.PLAY);
    }
    if (
      gameData?.status === 'ended' ||
      gameState === GameState.ENDED ||
      gameResult
    ) {
      tabs.push(TABS.RESULTS);
    }
    tabs.push(TABS.PLAYERS);
    return tabs;
  };

  const countDownText =
    gameState === GameState.ENDED
      ? t('Game has ended')
      : countdown === 'Game has started!' && isAdmin
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
    } catch (error) {
      console.error('Error starting game:', error);
      toast.error(
        error instanceof Error
          ? `${t('Error starting game')}: ${error.message}`
          : t('Error starting game')
      );
    } finally {
      setIsStartingGame(false);
    }
  };

  const errorColor = 'var(--color-error)';

  // Show "Connect Wallet" screen if publicKey is null
  if (publicKey === null) {
    return <ConnectWallet />;
  }

  // Show "Creator Only" screen if publicKey exists but user is not admin
  if (partialGameData && publicKey && !isAdmin) {
    return <CreatorOnly gameCode={gameCode} />;
  }

  if (!isMounted || isLoading || !gameData) return <MainSkeleton />;
  if (error) return <ErrorDisplay message={error} />;

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
                    <Row className='gap-2 mb-4'>
                      {countdown === 'Game has started!' || countdown === '' ? (
                        <div style={{ height: '24px' }} />
                      ) : (
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
                    {isAdmin &&
                      (gameState === GameState.JOINED ||
                        gameState === GameState.JOINING) && (
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
const ConnectWallet = () => {
  const { t } = useAppContext();
  return (
    <ScreenContainer>
      <Header />
      <InnerScreenContainer>
        <Column className='w-full h-64 items-center justify-center'>
          <div className='text-xl mb-4'>{t('Please Connect Your Wallet')}</div>
          <div>{t('You need to connect your wallet to manage this game.')}</div>
        </Column>
      </InnerScreenContainer>
    </ScreenContainer>
  );
};

const CreatorOnly = ({ gameCode }: { gameCode: string }) => {
  const { t, language } = useAppContext();
  return (
    <ScreenContainer>
      <Header />
      <InnerScreenContainer>
        <Column className='w-full h-64 items-center justify-center'>
          <div className='text-xl mb-4'>{t('Creator Access Only')}</div>
          <div className='text-center mb-4'>
            {t(
              'Only the game creator can view this page. If you are the game creator, please connect with the correct wallet. Otherwise, go to the player page to participate in this game.'
            )}
          </div>
          <Link className='w-full' href={`/${language}/game/${gameCode}`}>
            <Button>{t('Go to Player Page')}</Button>
          </Link>
        </Column>
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
