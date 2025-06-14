import { useState, useEffect, useCallback, useRef } from 'react';
import { Column, Label, Row, Button, H2, H3, H3Secondary } from '@/components';
import { useGameContext } from '../../contexts/GameContext';
import { useAppContext } from '@/contexts';
import { countDownGameTime, getCurrentConfig, GameState } from '@/utils';
import { RiSurveyLine } from 'react-icons/ri';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import EndGameButton from './EndGameButton';
import { toast } from 'react-toastify';
import { StoredGameSession } from '@/types';

const { network } = getCurrentConfig();

interface PlayGameProps {
  goToResults?: () => void;
}

const PlayGame = ({ goToResults = () => {} }: PlayGameProps) => {
  const { t } = useAppContext();
  const {
    gameData,
    submitAnswer,
    getCurrentAnswer,
    handleSubmitAnswers,
    isAdmin,
    gameState,
    gameSession,
    setGameSession,
    rehydrationError,
  } = useGameContext();

  const [remainingTime, setRemainingTime] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTimeExpired, setIsTimeExpired] = useState(false);
  const [bufferTimeRemaining, setBufferTimeRemaining] = useState<string>('');
  const hasHandledTimeExpiration = useRef(false);

  const { name, questions, end_time } = gameData || {};
  const currentQuestion = questions?.[currentQuestionIndex];

  // Get current answer from game session
  const selectedAnswer = currentQuestion
    ? getCurrentAnswer(currentQuestion.id)?.answerId
    : '';

  const handleAutoSubmitUnanswered =
    useCallback((): StoredGameSession | null => {
      if (!questions || !gameSession) return null;

      // Set the submitted time to the game's end time
      const endTime = new Date(end_time).getTime();
      let updatedSession: StoredGameSession = { ...gameSession };
      updatedSession.submittedTime = endTime;

      // For each question that doesn't have an answer
      for (const question of questions) {
        const existingAnswer = getCurrentAnswer(question.id);
        if (!existingAnswer && question.answers.length > 0) {
          // Auto-submit the first answer
          const firstAnswer = question.answers[0];
          const newSession = submitAnswer({
            questionId: question.id,
            answerId: firstAnswer.id,
            answer: firstAnswer.answer_text,
            displayOrder: question.display_order,
            timestamp: endTime,
            displayLetter: firstAnswer.display_letter,
          });
          if (newSession) {
            updatedSession = newSession;
          }
        }
      }

      return updatedSession;
    }, [questions, gameSession, getCurrentAnswer, submitAnswer, end_time]);

  const handleTimeExpired = useCallback((): StoredGameSession | null => {
    const updatedSession = handleAutoSubmitUnanswered();
    if (updatedSession) {
      return updatedSession;
    }
    return null;
  }, [handleAutoSubmitUnanswered]);

  // Show toast when time expires
  useEffect(() => {
    if (
      isTimeExpired &&
      !isAdmin &&
      !bufferTimeRemaining &&
      gameState !== GameState.SUBMITTED
    ) {
      toast.warning(
        t('Time has expired. Please review and submit your answers.')
      );
    }
  }, [isTimeExpired, isAdmin, t, gameState, bufferTimeRemaining]);

  // Timer effect - only handles checking time and setting isTimeExpired
  useEffect(() => {
    if (gameState !== GameState.ACTIVE || !end_time) return;

    const endTimeDate = new Date(end_time);
    const now = new Date();

    // Check if time has already expired
    if (now >= endTimeDate) {
      setIsTimeExpired(true);
      return;
    }

    // Update timer
    const updateTimer = () => {
      const timeLeft = countDownGameTime(end_time);
      setRemainingTime(timeLeft);

      if (timeLeft === 'Time is up!') {
        setIsTimeExpired(true);
        return true; // Signal to stop the timer
      }
      return false; // Continue the timer
    };

    updateTimer(); // Initial call
    const timer = setInterval(() => {
      const shouldStop = updateTimer();
      if (shouldStop) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [end_time, gameState, setIsTimeExpired]);

  // Separate effect to handle game session updates when time expires
  useEffect(() => {
    if (isTimeExpired && !hasHandledTimeExpiration.current) {
      const updatedSession = handleTimeExpired();
      if (updatedSession !== null) {
        setGameSession(updatedSession);
        hasHandledTimeExpiration.current = true;
      }
    }
  }, [isTimeExpired, handleTimeExpired, setGameSession]);

  // Reset the ref when game state changes
  useEffect(() => {
    hasHandledTimeExpiration.current = false;
  }, [gameState]);

  // Separate effect for buffer time
  useEffect(() => {
    if (!isTimeExpired || !end_time) return;

    const endTimeMs = new Date(end_time).getTime();
    const bufferEndTime = endTimeMs + 30000;

    const updateBufferTimer = () => {
      const bufferTime = countDownGameTime(bufferEndTime);
      setBufferTimeRemaining(bufferTime);

      if (bufferTime === 'Time is up!') {
        return true; // Signal to stop the timer
      }
      return false; // Continue the timer
    };

    updateBufferTimer(); // Initial call
    const timer = setInterval(() => {
      const shouldStop = updateBufferTimer();
      if (shouldStop) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimeExpired, end_time]);

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < (questions?.length || 0) - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handleAnswerSelect = (answerId: string) => {
    if (!currentQuestion) return;

    // Save answer to game session
    submitAnswer({
      questionId: currentQuestion.id,
      answerId,
      answer:
        currentQuestion.answers.find((a) => a.id === answerId)?.answer_text ||
        '',
      displayOrder: currentQuestion.display_order,
      timestamp: Date.now(),
      displayLetter:
        currentQuestion.answers.find((a) => a.id === answerId)
          ?.display_letter || '',
    });
  };

  const onSubmitAnswers = async () => {
    // Check if game has ended or buffer time has expired
    if (
      gameData?.status === 'ended' ||
      gameState === GameState.ENDED ||
      bufferTimeRemaining === 'Time is up!'
    ) {
      toast.error(t('Game has already ended. Cannot submit answers.'));
      return;
    }

    setIsSubmitting(true);
    try {
      const signature = await handleSubmitAnswers();
      if (signature) {
        toast.success(
          <div>
            {t('Answers submitted!')}
            <a
              href={`https://explorer.solana.com/tx/${signature}?cluster=${network}`}
              target='_blank'
              rel='noopener noreferrer'
              className='text-secondary hover:text-primary ml-2'
            >
              {t('View transaction')}
            </a>
          </div>,
          {
            autoClose: false,
          }
        );
      }
    } catch (error) {
      toast.error(t('Error submitting answers:'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (currentQuestionIndex === (questions?.length || 0) - 1) {
      await onSubmitAnswers();
    } else {
      handleNextQuestion();
    }
  };

  const isLastQuestion = currentQuestionIndex === (questions?.length || 0) - 1;
  const bufferTimeText = isAdmin
    ? // show admin how much time to allow users to submit
      `${t('Allow users to submit answers')}: ${bufferTimeRemaining}`
    : bufferTimeRemaining === 'Time is up!'
    ? // show time is up to both admin and player
      t('Time is up')
    : // show player how much time they have left to submit
      `${t('Submit answers within')} ${bufferTimeRemaining}`;

  if (rehydrationError) {
    return (
      <Column className='gap-4 w-full items-center justify-center'>
        <H2>{t('Error')}</H2>
        <Label style={{ color: 'var(--color-error)' }}>
          {rehydrationError}
        </Label>
      </Column>
    );
  }

  if (!currentQuestion) return null;

  // Waiting for game to start state
  if (gameState !== GameState.ACTIVE) {
    return (
      <Column className='gap-4 w-full' justify='start'>
        <H2>{name}</H2>
        <div className='flex px-[10px] py-[6px] md:px-[14px] md:py-[10px] justify-center items-center self-stretch rounded-lg bg-[#FBF9E9] gap-4 w-full max-w-small mx-auto text-[14px] text-[#655B30] active:opacity-80'>
          <Row className='gap-2'>
            <RiSurveyLine size={28} className='text-yellow' />
            <Label style={{ marginBottom: -4 }}>
              {t('Waiting for game to start...')}
            </Label>
          </Row>
        </div>
      </Column>
    );
  }

  return (
    <form onSubmit={handleFormSubmit} className='gap-4 w-full flex flex-col'>
      {/* Timer Header */}
      <H2>{name}</H2>
      <div className='flex px-[10px] py-[6px] md:px-[14px] md:py-[10px] justify-center items-center self-stretch rounded-lg bg-[#E8F7EA] gap-4 w-full max-w-small mx-auto text-[14px] text-green active:opacity-80'>
        <Row className='gap-2'>
          <RiSurveyLine size={28} />
          <Label style={{ marginBottom: -4, color: 'var(--color-success)' }}>
            {isTimeExpired
              ? `${bufferTimeText}`
              : `${t('Game in progress')}: ${remainingTime}`}
          </Label>
        </Row>
      </div>

      {/* Question Counter */}
      <H3Secondary className='text-center'>
        {t('Question')} {currentQuestionIndex + 1} / {questions?.length}
      </H3Secondary>

      {/* Question Text */}
      <div className='p-6 rounded-lg bg-surface'>
        <H3 className='mb-4' style={{ userSelect: 'none' }}>
          {currentQuestion.question_text}
        </H3>

        {/* Answer Options */}
        <div className='space-y-3'>
          {currentQuestion.answers.map((answer) => (
            <button
              key={answer.id}
              type='button'
              disabled={isTimeExpired || isAdmin}
              onClick={() => handleAnswerSelect(answer.id)}
              className={`w-full my-1 p-4 text-left rounded-lg border transition-colors ${
                selectedAnswer === answer.id
                  ? 'bg-primary border-primary text-white'
                  : 'bg-transparent border-secondaryText hover:border-primaryText text-primaryText'
              }`}
            >
              <span className='font-semibold mr-2'>
                {answer.display_letter}.
              </span>
              <span style={{ userSelect: 'none' }}>{answer.answer_text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <Row className='justify-between w-full mt-4'>
        <div className='w-[48%]'>
          <Button
            secondary
            type='button'
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
            className='flex items-center gap-2'
          >
            <FaArrowLeft size={16} />
            {t('Previous')}
          </Button>
        </div>
        <div className='w-[48%]'>
          {!(isAdmin && isLastQuestion) && (
            <Button
              type='submit'
              disabled={!selectedAnswer && !isAdmin}
              className='flex items-center gap-2'
              isLoading={isSubmitting}
            >
              {isLastQuestion ? (
                t('Submit')
              ) : (
                <>
                  {t('Next')}
                  <FaArrowRight size={16} />
                </>
              )}
            </Button>
          )}
        </div>
      </Row>
      {isAdmin && (
        <EndGameButton
          goToResults={goToResults}
          bufferTimeRemaining={bufferTimeRemaining}
        />
      )}
    </form>
  );
};

export default PlayGame;
