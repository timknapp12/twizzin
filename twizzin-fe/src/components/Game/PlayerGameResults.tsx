import React from 'react';
import { Column, H2, H3, Label } from '@/components';
import { useGameContext, useAppContext } from '@/contexts';
import { RiCheckFill, RiCloseFill } from 'react-icons/ri';

const PlayerGameResults = () => {
  const { t } = useAppContext();
  const { gameResult, gameData } = useGameContext();

  if (!gameResult || !gameData) return null;

  const {
    totalCorrect,
    totalQuestions,
    answeredQuestions,
    xpEarned,
    finalRank,
  } = gameResult;
  const scorePercentage = Math.round((totalCorrect / totalQuestions) * 100);

  return (
    <Column className='gap-6 w-full'>
      <H2>{gameData.name}</H2>

      {/* Score Summary */}
      <div className='bg-white p-6 rounded-lg shadow-lg text-center'>
        <H3>{t('Game Complete!')}</H3>
        <div className='text-3xl font-bold mt-4 text-primary'>
          {scorePercentage}%
        </div>
        <Label className='mt-2'>
          {t('You got')} {totalCorrect} {t('out of')} {totalQuestions}{' '}
          {t('correct')}
        </Label>
        {xpEarned && (
          <Label className='mt-2 text-green-600'>
            +{xpEarned} XP {t('earned')}
          </Label>
        )}
        {finalRank && (
          <Label className='mt-2'>
            {t('Final Rank')}: #{finalRank}
          </Label>
        )}
      </div>

      {/* Questions Review */}
      <div className='space-y-4'>
        {answeredQuestions.map((question, index) => (
          <div
            key={question.questionId}
            className='bg-white p-6 rounded-lg shadow-lg'
          >
            <div className='flex items-start gap-4'>
              <div className='flex-shrink-0'>
                {question.isCorrect ? (
                  <RiCheckFill className='w-6 h-6 text-green-500' />
                ) : (
                  <RiCloseFill className='w-6 h-6 text-red-500' />
                )}
              </div>
              <div className='flex-grow'>
                <H3 className='text-lg font-semibold mb-4'>
                  {index + 1}. {question.questionText}
                </H3>
                <div className='space-y-2'>
                  {question.userAnswer ? (
                    <div
                      className={`p-3 rounded-lg ${
                        question.isCorrect
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      <Label className='font-medium'>
                        {t('Your answer')}: {question.userAnswer.displayLetter}.{' '}
                        {question.userAnswer.text}
                      </Label>
                    </div>
                  ) : (
                    <div className='p-3 rounded-lg bg-gray-50 border border-gray-200'>
                      <Label className='font-medium'>
                        {t('No answer provided')}
                      </Label>
                    </div>
                  )}
                  {!question.isCorrect && (
                    <div className='p-3 rounded-lg bg-gray-50 border border-gray-200'>
                      <Label className='font-medium'>
                        {t('Correct answer')}:{' '}
                        {question.correctAnswer.displayLetter}.{' '}
                        {question.correctAnswer.text}
                      </Label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Column>
  );
};

export default PlayerGameResults;
