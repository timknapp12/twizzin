import React from 'react';
import { Column, H2, H3, Label } from '@/components';
import { useGameContext, useAppContext } from '@/contexts';
import {
  RiCheckFill,
  RiCloseFill,
  RiTrophyFill,
  RiMedalFill,
} from 'react-icons/ri';
import { useWallet } from '@solana/wallet-adapter-react';

const PlayerGameResults = () => {
  const { t } = useAppContext();
  const { gameResult, gameData, isAdmin, isLoadingResults, loadError } =
    useGameContext();
  const { publicKey } = useWallet();

  if (!gameData) return null;

  // Show loading state
  if (isLoadingResults) {
    return (
      <div className='w-full max-w-4xl mx-auto'>
        <H2>{gameData.name}</H2>
        <div className='bg-white p-6 rounded-lg shadow-lg text-center'>
          <Label>{t('Loading game results...')}</Label>
        </div>
      </div>
    );
  }

  // Show error state
  if (loadError) {
    return (
      <div className='w-full max-w-4xl mx-auto'>
        <H2>{gameData.name}</H2>
        <div className='bg-white p-6 rounded-lg shadow-lg text-center'>
          <Label className='text-red-600'>{loadError}</Label>
        </div>
      </div>
    );
  }

  // Early return with just winners/leaderboard for non-players and admins
  const isPlayer =
    gameResult?.answeredQuestions &&
    publicKey &&
    gameResult.leaderboard?.some(
      (player) => player.wallet === publicKey.toString()
    );

  const { winners = [], leaderboard = [] } = gameResult || {};

  // Helper functions
  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-50 border-yellow-200';
      case 2:
        return 'bg-gray-50 border-gray-200';
      case 3:
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-white border-gray-100';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <RiTrophyFill className='w-6 h-6 text-yellow-500' />;
      case 2:
        return <RiMedalFill className='w-6 h-6 text-gray-400' />;
      case 3:
        return <RiMedalFill className='w-6 h-6 text-orange-400' />;
      default:
        return null;
    }
  };

  return (
    <Column className='gap-6 w-full max-w-4xl mx-auto'>
      <H2>{gameData.name}</H2>

      {/* Show player's personal results only if they played */}
      {isPlayer && gameResult && (
        <div className='bg-white p-6 rounded-lg shadow-lg text-center'>
          <H3>{t('Game Complete!')}</H3>
          <div className='text-3xl font-bold mt-4 text-primary'>
            {Math.round(
              (gameResult.totalCorrect / gameResult.totalQuestions) * 100
            )}
            %
          </div>
          <Label className='mt-2'>
            {t('Correct answers')}: {gameResult.totalCorrect} /
            {gameResult.totalQuestions}
          </Label>
          {gameResult.xpEarned && (
            <Label className='mt-2 text-green-600'>
              {t('Earned XP')}: {gameResult.xpEarned}
            </Label>
          )}
          {gameResult.finalRank && (
            <Label className='mt-2'>
              {t('Final Rank')}: #{gameResult.finalRank}
            </Label>
          )}
        </div>
      )}

      {/* Show message for admin */}
      {isAdmin && (
        <div className='bg-white p-4 rounded-lg shadow-lg text-center'>
          <Label>{t('You are viewing this game as an admin')}</Label>
        </div>
      )}

      {/* Show message for spectators */}
      {!isPlayer && !isAdmin && (
        <div className='bg-white p-4 rounded-lg shadow-lg text-center'>
          <Label>{t('You are viewing this game as a spectator')}</Label>
        </div>
      )}

      {/* Winners Section - shown to everyone */}
      {winners.length > 0 && (
        <div className='bg-white p-6 rounded-lg shadow-lg'>
          <H3 className='mb-4'>{t('Winners')}</H3>
          <div className='space-y-2'>
            {winners.map((winner, index) => (
              <div
                key={winner.wallet}
                className={`p-4 rounded-lg border flex items-center justify-between ${getRankColor(
                  index + 1
                )}`}
              >
                <div className='flex items-center gap-3'>
                  {getRankIcon(index + 1)}
                  <div>
                    <Label className='font-semibold'>
                      {winner.wallet.slice(0, 4)}...{winner.wallet.slice(-4)}
                      {winner.wallet === publicKey?.toString() && (
                        <span className='ml-2 text-primary'>{t('(You)')}</span>
                      )}
                    </Label>
                    <Label className='text-sm text-gray-600'>
                      {winner.numCorrect} {t('correct')} •{' '}
                      {new Date(winner.finishTime).toLocaleTimeString()}
                    </Label>
                  </div>
                </div>
                {winner.xpEarned && (
                  <Label className='text-green-600'>
                    +{winner.xpEarned} XP
                  </Label>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard Section - shown to everyone */}
      {leaderboard.length > 0 && (
        <div className='bg-white p-6 rounded-lg shadow-lg'>
          <H3 className='mb-4'>{t('Leaderboard')}</H3>
          <div className='space-y-2'>
            {leaderboard.map((player) => (
              <div
                key={player.wallet}
                className={`p-4 rounded-lg border ${
                  player.wallet === publicKey?.toString()
                    ? 'bg-primary-50 border-primary-200'
                    : 'bg-white border-gray-100'
                }`}
              >
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <Label className='font-medium w-8'>#{player.rank}</Label>
                    <div>
                      <Label className='font-semibold'>
                        {player.wallet.slice(0, 4)}...{player.wallet.slice(-4)}
                        {player.wallet === publicKey?.toString() && (
                          <span className='ml-2 text-primary'>
                            {t('(You)')}
                          </span>
                        )}
                      </Label>
                      <Label className='text-sm text-gray-600'>
                        {player.numCorrect} {t('correct')} •{' '}
                        {new Date(player.finishTime).toLocaleTimeString()}
                      </Label>
                    </div>
                  </div>
                  {player.xpEarned && (
                    <Label className='text-green-600'>
                      +{player.xpEarned} XP
                    </Label>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Questions Review - only shown to players */}
      {isPlayer && gameResult?.answeredQuestions && (
        <div className='space-y-4'>
          <H3>{t('Your Answers')}</H3>
          {gameResult.answeredQuestions.map((question, index) => (
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
                          {t('Your answer')}:{' '}
                          {question.userAnswer.displayLetter}.{' '}
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
      )}
    </Column>
  );
};

export default PlayerGameResults;
