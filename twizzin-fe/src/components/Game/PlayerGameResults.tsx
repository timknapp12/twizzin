import React from 'react';
import { Column, H2, H3, Label, Row, Button } from '@/components';
import { useGameContext, useAppContext } from '@/contexts';
import {
  RiCheckFill,
  RiCloseFill,
  RiTrophyFill,
  RiMedalFill,
  RiSurveyLine,
} from 'react-icons/ri';
import { useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

const PlayerGameResults = () => {
  const { t } = useAppContext();
  const { gameResult, gameData, isLoadingResults, loadError } =
    useGameContext();
  const { publicKey } = useWallet();

  if (!gameData) return null;
  console.log('gameResult', gameResult);
  // Show loading state
  if (isLoadingResults) {
    return (
      <Column className='gap-4 w-full max-w-4xl mx-auto'>
        <H2>{gameData.name}</H2>
        <div className='flex px-[10px] py-[6px] md:px-[14px] md:py-[10px] justify-center items-center self-stretch rounded-lg bg-[#FBF9E9] gap-4 w-full max-w-small mx-auto text-[16px] active:opacity-80'>
          <Row className='gap-2'>
            <RiSurveyLine size={28} color='var(--color-tertiary)' />
            <Label style={{ marginBottom: -4 }}>
              {t('Loading game results...')}
            </Label>
          </Row>
        </div>
      </Column>
    );
  }

  // Show error state
  if (loadError) {
    return (
      <Column className='gap-4 w-full max-w-4xl mx-auto'>
        <H2>{gameData.name}</H2>
        <div className='flex px-[10px] py-[6px] md:px-[14px] md:py-[10px] justify-center items-center self-stretch rounded-lg bg-[#FFEAEA] gap-4 w-full max-w-small mx-auto text-[16px] active:opacity-80'>
          <Row className='gap-2'>
            <RiCloseFill size={28} color='var(--color-error)' />
            <Label style={{ color: 'var(--color-error)', marginBottom: -4 }}>
              {loadError}
            </Label>
          </Row>
        </div>
      </Column>
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
        return 'bg-yellow-50 border-yellow';
      case 2:
        return 'bg-gray-50 border-gray';
      case 3:
        return 'bg-orange-50 border-orange';
      default:
        return ' border-gray';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <RiTrophyFill className='w-6 h-6 text-yellow' />;
      case 2:
        return <RiMedalFill className='w-6 h-6 text-gray' />;
      case 3:
        return <RiMedalFill className='w-6 h-6 text-orange' />;
      default:
        return null;
    }
  };

  return (
    <Column className='gap-6 w-full'>
      <H2>{gameData.name}</H2>

      {/* Status banner */}
      <div className='flex px-[10px] py-[6px] md:px-[14px] md:py-[10px] justify-center items-center self-stretch rounded-lg bg-[#E8F7EA] gap-4 w-full max-w-small mx-auto text-[16px] active:opacity-80'>
        <Row className='gap-2'>
          <RiCheckFill size={28} color='var(--color-success)' />
          <Label style={{ color: 'var(--color-success)', marginBottom: -4 }}>
            {t('Game Complete!')}
          </Label>
        </Row>
      </div>

      {/* Show player's personal results only if they played */}
      {isPlayer && gameResult && (
        <div className=' p-6 rounded-lg shadow-xl text-center w-full bg-surface'>
          <H3 className='mb-4'>{t('Your Results')}</H3>
          <div className='flex flex-col md:flex-row justify-center gap-6 items-center md:items-start'>
            <div className='flex flex-col items-center'>
              <div className='text-4xl font-bold mb-2 text-primary'>
                {Math.round(
                  (gameResult.totalCorrect / gameResult.totalQuestions) * 100
                )}
                %
              </div>
              <Label>{t('Score')}</Label>
            </div>

            <div className='flex flex-col items-center'>
              <div className='text-4xl font-bold mb-2 text-primaryText'>
                {gameResult.totalCorrect}/{gameResult.totalQuestions}
              </div>
              <Label>{t('Correct Answers')}</Label>
            </div>

            {gameResult.xpEarned && (
              <div className='flex flex-col items-center'>
                <div className='text-4xl font-bold mb-2 text-green-600'>
                  +{gameResult.xpEarned}
                </div>
                <Label>{t('XP Earned')}</Label>
              </div>
            )}

            {gameResult.rewardsEarned && (
              <div className='flex flex-col items-center'>
                <div className='text-4xl font-bold mb-2 text-green-600'>
                  {/* TODO change to decimals */}+
                  {gameResult.rewardsEarned / LAMPORTS_PER_SOL} SOL
                </div>
                <Label>{t('Rewards Earned')}</Label>
              </div>
            )}

            {gameResult.finalRank && (
              <div className='flex flex-col items-center'>
                <div className='text-4xl font-bold mb-2 text-secondary'>
                  #{gameResult.finalRank}
                </div>
                <Label>{t('Final Rank')}</Label>
              </div>
            )}
          </div>
        </div>
      )}

      <Row className='flex flex-col lg:flex-row gap-6 w-full'>
        {/* Questions Review - only shown to players */}
        {isPlayer && gameResult?.answeredQuestions && (
          <div className='space-y-4 w-full lg:w-1/2'>
            <H3>{t('Your Answers')}</H3>
            {gameResult.answeredQuestions.map((question, index) => (
              <div
                key={question.questionId}
                className=' p-6 rounded-lg shadow-xl'
              >
                <div className='flex items-start gap-4'>
                  <div className='flex-shrink-0'>
                    {question.isCorrect ? (
                      <div className='w-8 h-8 rounded-full bg-green-100 flex items-center justify-center'>
                        <RiCheckFill className='w-5 h-5 text-green-500' />
                      </div>
                    ) : (
                      <div className='w-8 h-8 rounded-full bg-red-100 flex items-center justify-center'>
                        <RiCloseFill className='w-5 h-5 text-red-500' />
                      </div>
                    )}
                  </div>
                  <div className='flex-grow'>
                    <H3 className='text-lg font-semibold mb-4'>
                      {index + 1}. {question.questionText}
                    </H3>
                    <div className='space-y-2'>
                      {question.userAnswer ? (
                        <div
                          className={`p-4 rounded-lg ${
                            question.isCorrect
                              ? 'bg-green-50 border border-green'
                              : 'bg-red-50 border border-red'
                          }`}
                        >
                          <Label className='font-medium'>
                            {t('Your answer')}:{' '}
                            <span className='inline-block w-6 h-6 rounded-full  text-center leading-6 mr-2'>
                              {question.userAnswer.displayLetter}
                            </span>
                            {question.userAnswer.text}
                          </Label>
                        </div>
                      ) : (
                        <div className='p-4 rounded-lg border border-gray'>
                          <Label className='font-medium'>
                            {t('No answer provided')}
                          </Label>
                        </div>
                      )}
                      {!question.isCorrect && (
                        <div className='p-4 rounded-lg bg-green-50 border border-green'>
                          <Label className='font-medium'>
                            {t('Correct answer')}:{' '}
                            <span className='inline-block w-6 h-6 rounded-full  text-center leading-6 mr-2'>
                              {question.correctAnswer.displayLetter}
                            </span>
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
        <Column className='w-full lg:w-1/2'>
          {/* Winners Section - shown to everyone */}
          {winners.length > 0 && (
            <div className='p-6 rounded-lg shadow-xl w-full'>
              <H3 className='mb-4'>{t('Winners')}</H3>
              <div className='space-y-2'>
                {winners.map((winner, index) => (
                  <div
                    key={winner.wallet}
                    className={`p-4 rounded-lg border flex items-center justify-between ${getRankColor(
                      index + 1
                    )}`}
                  >
                    <Row className='gap-2'>
                      {getRankIcon(index + 1)}
                      <div>
                        <Label className='font-semibold'>
                          {winner.wallet.slice(0, 4)}...
                          {winner.wallet.slice(-4)}
                          {winner.wallet === publicKey?.toString() && (
                            <span className='ml-2 text-primary'>
                              {t('(You)')}
                            </span>
                          )}
                        </Label>
                        <Label className='text-sm text-gray'>
                          {winner.numCorrect} {t('correct')} •{' '}
                          {new Date(winner.finishTime).toLocaleTimeString()}
                        </Label>
                      </div>
                    </Row>
                    {winner.xpEarned && (
                      <Label className='text-green-600 font-medium text-lg'>
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
            <div className='p-6 rounded-lg shadow-xl w-full'>
              <H3 className='mb-4'>{t('Leaderboard')}</H3>
              <div className='space-y-2'>
                {leaderboard.map((player) => (
                  <div
                    key={player.wallet}
                    className={`p-4 rounded-lg border ${
                      player.wallet === publicKey?.toString()
                        ? 'bg-primary-50 border-primary-200'
                        : ' border-gray-100'
                    }`}
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center 2'>
                        <div className='w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center'>
                          <Label className='font-medium'>#{player.rank}</Label>
                        </div>
                        <div>
                          <Label className='font-semibold'>
                            {player.wallet.slice(0, 4)}...
                            {player.wallet.slice(-4)}
                            {player.wallet === publicKey?.toString() && (
                              <span className='ml-2 text-primary'>
                                {t('(You)')}
                              </span>
                            )}
                          </Label>
                          <Label className='text-sm text-gray'>
                            {player.numCorrect} {t('correct')} •{' '}
                            {new Date(player.finishTime).toLocaleTimeString()}
                          </Label>
                        </div>
                      </div>
                      {player.xpEarned && (
                        <Label className='text-green font-medium'>
                          +{player.xpEarned} XP
                        </Label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Column>
      </Row>

      {/* Share Results Button */}
      {isPlayer && gameResult && (
        <Button
          className='mt-4'
          onClick={() => {
            // Share functionality would go here
            // For now just show a dummy function
            alert('Share functionality would go here');
          }}
        >
          {t('Share Results')}
        </Button>
      )}
    </Column>
  );
};

export default PlayerGameResults;
