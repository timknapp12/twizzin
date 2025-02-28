import React from 'react';
import { Column, H2, H3, H5, Label, Row, Button } from '@/components';
import { useGameContext, useAppContext } from '@/contexts';
import {
  RiCheckFill,
  RiCloseFill,
  RiTrophyFill,
  RiMedalFill,
  RiSurveyLine,
  RiTimeLine,
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

  // Check if player has submitted answers (has personal results)
  const hasSubmittedAnswers = !!gameResult?.answeredQuestions;

  // Check if game has ended and we have leaderboard data
  const gameEnded = gameData.status === 'ended' && gameResult?.leaderboard;

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

      {/* Status banner - changes based on game state */}
      <div
        className={`flex px-[10px] py-[6px] md:px-[14px] md:py-[10px] justify-center items-center self-stretch rounded-lg gap-4 w-full max-w-small mx-auto text-[16px] active:opacity-80 ${
          gameEnded ? 'bg-[#E8F7EA]' : 'bg-[#FFF8E0]'
        }`}
      >
        <Row className='gap-2'>
          {gameEnded ? (
            <>
              <RiCheckFill size={28} color='var(--color-success)' />
              <Label
                style={{ color: 'var(--color-success)', marginBottom: -2 }}
              >
                {t('Game Complete!')}
              </Label>
            </>
          ) : (
            <>
              <RiTimeLine size={28} color='var(--color-warning)' />
              <Label
                style={{ color: 'var(--color-warning)', marginBottom: -2 }}
              >
                {t('Waiting for game to end...')}
              </Label>
            </>
          )}
        </Row>
      </div>

      {/* Show player's personal results if they submitted answers */}
      {hasSubmittedAnswers && (
        <div className='p-6 rounded-lg shadow-xl text-center w-full bg-surface'>
          <H5 className='mb-4'>{t('Your Results')}</H5>
          <div className='flex flex-col md:flex-row justify-center gap-6 items-center md:items-start'>
            <div className='flex flex-col items-center'>
              <H5>
                {Math.round(
                  (gameResult.totalCorrect / gameResult.totalQuestions) * 100
                )}
                %
              </H5>
              <Label>{t('Score')}</Label>
            </div>

            <div className='flex flex-col items-center'>
              <H5>
                {gameResult.totalCorrect}/{gameResult.totalQuestions}
              </H5>
              <Label>{t('Correct Answers')}</Label>
            </div>

            {gameEnded && gameResult.xpEarned && (
              <div className='flex flex-col items-center'>
                <H5>+{gameResult.xpEarned}</H5>
                <Label>{t('XP Earned')}</Label>
              </div>
            )}

            {gameEnded && gameResult.rewardsEarned && (
              <div className='flex flex-col items-center'>
                <H5>+{gameResult.rewardsEarned / LAMPORTS_PER_SOL} SOL</H5>
                <Label>{t('Rewards Earned')}</Label>
              </div>
            )}

            {gameEnded && gameResult.finalRank && (
              <div className='flex flex-col items-center'>
                <H5>#{gameResult.finalRank}</H5>
                <Label>{t('Final Rank')}</Label>
              </div>
            )}
          </div>

          {!gameEnded && (
            <div className='mt-4 text-sm text-gray-600'>
              {t(
                'Additional rewards and ranking will be available when the game ends'
              )}
            </div>
          )}
        </div>
      )}

      <Row className='flex flex-col lg:flex-row gap-6 w-full'>
        {/* Questions Review - always shown if player has submitted answers */}
        {hasSubmittedAnswers && (
          <div className='space-y-4 w-full lg:w-1/2'>
            <H3>{t('Your Answers')}</H3>
            {gameResult.answeredQuestions.map((question, index) => (
              <div
                key={question.questionId}
                className='p-6 rounded-lg shadow-xl'
              >
                <div className='flex items-start gap-4'>
                  <div className='flex-shrink-0'>
                    {question.isCorrect ? (
                      <div className='w-8 h-8 rounded-full bg-green-100 flex items-center justify-center'>
                        <RiCheckFill className='w-5 h-5 text-green' />
                      </div>
                    ) : (
                      <div className='w-8 h-8 rounded-full flex items-center justify-center'>
                        <RiCloseFill className='w-5 h-5 text-red' />
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
                            <span className='inline-block w-6 h-6 rounded-full text-center leading-6 mr-2'>
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
                      {/* Show correct answer for incorrect responses and while waiting */}
                      {(!question.isCorrect || !gameEnded) && (
                        <div className='p-4 rounded-lg bg-green-50 border border-green'>
                          <Label className='font-medium'>
                            {t('Correct answer')}:{' '}
                            <span className='inline-block w-6 h-6 rounded-full text-center leading-6 mr-2'>
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

        {/* Leaderboard column - only shown if game has ended */}
        {gameEnded && (
          <Column className='w-full lg:w-1/2'>
            {/* Winners Section */}
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
                        <Label className='text-green font-medium text-lg'>
                          +{winner.xpEarned} XP
                        </Label>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Leaderboard Section */}
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
                        <div className='flex items-center gap-2'>
                          <div className='w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center'>
                            <Label className='font-medium'>
                              #{player.rank}
                            </Label>
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
        )}

        {/* If game hasn't ended, show waiting message in place of leaderboard */}
        {!gameEnded && hasSubmittedAnswers && (
          <div className='w-full lg:w-1/2 p-6 rounded-lg shadow-xl flex flex-col items-center justify-center'>
            <RiTimeLine size={48} className='text-gray-400 mb-4' />
            <H3 className='text-center mb-2'>{t('Waiting for game to end')}</H3>
            <p className='text-gray-600 text-center'>
              {t(
                'The admin will end the game shortly. Leaderboard and rewards will be available once the game has ended.'
              )}
            </p>
          </div>
        )}
      </Row>

      {/* Share Results Button - only show when game has ended */}
      {gameEnded && hasSubmittedAnswers && (
        <Button
          className='mt-4'
          onClick={() => {
            // Share functionality would go here
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
