'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useVerification } from '@/hooks/useVerification';
import {
  Tabs,
  Tab,
  ScreenContainer,
  InnerScreenContainer,
  Button,
  Column,
  Row,
  Label,
  Header,
} from '@/components';
import { FaSpinner } from 'react-icons/fa6';
import { useGameContext } from '@/contexts';
import { useCreateGameContext } from '@/contexts';
import { useAppContext } from '@/contexts';
import DisplayAddedGame from '@/components/Create/DisplayAddedGame';
import AddUpdateGame from '@/components/Create/AddUpdateGame';
import { GameState, getGameFromDb, getRemainingTime } from '@/utils';
import { JoinFullGame, QuestionFromDb, QuestionForDb, GameDataChangeEvent } from '@/types';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { toast } from 'react-toastify';
import PlayGame from '@/components/Game/PlayGame';
import PlayerGameResults from '@/components/Game/PlayerGameResults';
import Link from 'next/link';
import { MainSkeleton } from '@/components/MainSkeleton';

const transformQuestionFromDbToForDb = (question: QuestionFromDb): QuestionForDb => ({
  id: question.id,
  displayOrder: question.display_order,
  questionText: question.question_text,
  correctAnswer: question.correct_answer,
  timeLimit: question.time_limit,
  answers: question.answers.map(answer => ({
    answerText: answer.answer_text,
    displayLetter: answer.display_letter,
    displayOrder: answer.display_order,
    isCorrect: answer.is_correct
  }))
});

export const CreatorGameComponent = () => {
  const params = useParams();
  const gameCode = params.gameCode as string;
  const { publicKey } = useWallet();
  const { withVerification, isVerified } = useVerification();
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
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [gameData, setGameData] = useState<JoinFullGame | null>(null);
  const [questions, setQuestions] = useState<QuestionForDb[]>([]);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [countdown, setCountdown] = useState<string>(
    getRemainingTime(gameData?.start_time || '')
  );
  const hasLoadedRef = useRef(false);

  // Single effect to handle all game data loading
  useEffect(() => {
    const loadGameData = async () => {
      console.log('Loading game data', publicKey, isAdmin, contextGameData, gameCode);
      if (!publicKey) {
        console.log('Skipping game data load - missing public key');
        setIsLoading(false);
        return;
      }

      // If we're not admin, we don't need to load full game data
      if (!isAdmin) {
        console.log('Skipping game data load - not admin');
        setIsLoading(false);
        return;
      }

      // If we already have the correct game data, don't reload
      if (contextGameData?.game_code === gameCode && hasLoadedRef.current) {
        console.log('Using existing context game data');
        setGameData(contextGameData);
        if (contextGameData.questions) {
          const formattedQuestions = contextGameData.questions.map(transformQuestionFromDbToForDb);
          setQuestions(formattedQuestions);
        }
        setIsLoading(false);
        return;
      }

      try {
        console.log('Fetching game data for code:', gameCode);
        await withVerification(
          () => getGameByCode(gameCode),
          'Please verify your wallet to load game data',
          isVerified
        );
        
        if (contextGameData) {
          console.log('Received context game data:', contextGameData);
          setGameData(contextGameData);
          if (contextGameData.questions) {
            const formattedQuestions = contextGameData.questions.map(transformQuestionFromDbToForDb);
            setQuestions(formattedQuestions);
          } else {
            setQuestions([]);
          }
          hasLoadedRef.current = true;
        } else {
          console.log('No context game data received');
          setQuestions([]);
        }
      } catch (err) {
        console.error('Error loading game:', err);
        setError(err instanceof Error ? err.message : t('Failed to load game'));
      } finally {
        setIsLoading(false);
      }
    };

    loadGameData();
  }, [gameCode, publicKey, isAdmin, contextGameData, getGameByCode, t, withVerification, isVerified]);

  // Reset the loaded ref when game code changes
  useEffect(() => {
    hasLoadedRef.current = false;
  }, [gameCode]);

  useEffect(() => {
    if (!gameData?.start_time) return;
    const timer = setInterval(() => {
      setCountdown(getRemainingTime(gameData?.start_time || ''));
    }, 1000);
    return () => clearInterval(timer);
  }, [gameData?.start_time]);

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

  const fetchFreshGameData = useCallback(async () => {
    if (!gameCode || !isAdmin) {
      console.log('Skipping fresh game data fetch - missing gameCode or not admin');
      return;
    }
    console.log('Fetching fresh game data for code:', gameCode);
    setIsRefreshing(true);
    try {
      const freshGameData = await withVerification(
        () => getGameFromDb(gameCode, withVerification),
        'Please verify your wallet to refresh game data',
        isVerified
      );
      if (!freshGameData) {
        console.log('No fresh game data found');
        toast.error(t('Game not found'));
        return null;
      }
      console.log('Received fresh game data:', freshGameData);
      setGameData(freshGameData);
      const formattedQuestions = freshGameData.questions.map(transformQuestionFromDbToForDb);
      console.log('Formatted questions from fresh data:', formattedQuestions);
      handleBulkQuestionUpdate(formattedQuestions);
      handleGameData({
        target: {
          name: 'gameName',
          value: freshGameData.name,
          type: 'text'
        }
      } as GameDataChangeEvent);
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
  }, [gameCode, t, isAdmin, withVerification, isVerified, handleBulkQuestionUpdate, handleGameData]);

  const handleSwitchToDetails = useCallback(async () => {
    await fetchFreshGameData();
    setActiveTab(TABS.DETAILS);
  }, [fetchFreshGameData, TABS.DETAILS]);

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

  if (!isLoading || !gameData) return <MainSkeleton />;
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
                      gameData={formatGameDataForForm(gameData)}
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
