import { useState, useEffect } from 'react';
import { Column, Label, Row, Button, H2, H3, H3Secondary } from '@/components';
import { useGameContext, useAppContext } from '@/contexts';
import { countDownGameTime, getCurrentConfig } from '@/utils';
import { RiSurveyLine } from 'react-icons/ri';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import EndGameButton from './EndGameButton';
import { toast } from 'react-toastify';

const { network } = getCurrentConfig();

const PlayGame = () => {
  const { t } = useAppContext();
  const {
    gameData,
    submitAnswer,
    getCurrentAnswer,
    handleSubmitAnswers,
    isAdmin,
  } = useGameContext();

  const [remainingTime, setRemainingTime] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { name, questions, end_time } = gameData || {};
  const currentQuestion = questions?.[currentQuestionIndex];

  // Get current answer from game session
  const selectedAnswer = currentQuestion
    ? getCurrentAnswer(currentQuestion.id)?.answerId
    : '';

  useEffect(() => {
    if (gameData.status !== 'active' || !end_time) return;

    setRemainingTime(countDownGameTime(end_time));
    const timer = setInterval(() => {
      setRemainingTime(countDownGameTime(end_time));
    }, 1000);

    return () => clearInterval(timer);
  }, [end_time, gameData.status]);

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
      answerText:
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
              className='text-var(--color-success) ml-2'
            >
              {t('View transaction')}
            </a>
          </div>,
          {
            autoClose: false,
            position: 'bottom-right',
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

  if (!currentQuestion) return null;

  // Waiting for game to start state
  if (gameData.status === 'not_started') {
    return (
      <Column className='gap-4 w-full' justify='start'>
        <H2>{name}</H2>
        <div className='flex px-[10px] py-[6px] md:px-[14px] md:py-[10px] justify-center items-center self-stretch rounded-lg bg-[#FBF9E9] gap-4 w-full max-w-small mx-auto text-[16px] text-[#655B30] active:opacity-80'>
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
      <div className='flex px-[10px] py-[6px] md:px-[14px] md:py-[10px] justify-center items-center self-stretch rounded-lg bg-[#E8F7EA] gap-4 w-full max-w-small mx-auto text-[16px] text-[#655B30] active:opacity-80'>
        <Row className='gap-2'>
          <RiSurveyLine size={28} className='text-green' />
          <Label style={{ marginBottom: -4 }}>
            {`${t('Game in progress')}: ${remainingTime}`}
          </Label>
        </Row>
      </div>

      {/* Question Counter */}
      <H3Secondary className='text-center'>
        {t('Question')} {currentQuestionIndex + 1} / {questions?.length}
      </H3Secondary>

      {/* Question Text */}
      <div className='bg-white p-6 rounded-lg shadow-lg'>
        <H3 className='mb-4'>{currentQuestion.question_text}</H3>

        {/* Answer Options */}
        <div className='space-y-3'>
          {currentQuestion.answers.map((answer) => (
            <button
              key={answer.id}
              type='button'
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
              {answer.answer_text}
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
          <Button
            type='submit'
            disabled={!selectedAnswer || isAdmin}
            className='flex items-center gap-2'
            isLoading={isSubmitting}
          >
            {currentQuestionIndex === (questions?.length || 0) - 1 ? (
              t('Submit')
            ) : (
              <>
                {t('Next')}
                <FaArrowRight size={16} />
              </>
            )}
          </Button>
          {isAdmin && <EndGameButton />}
        </div>
      </Row>
    </form>
  );
};

export default PlayGame;
