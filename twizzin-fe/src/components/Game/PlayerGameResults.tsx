import React from 'react';
import {
  Column,
  H2,
  H3,
  H5,
  Label,
  Row,
  Button,
  SecondaryText,
} from '@/components';
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
import { formatDetailedGameTime } from '@/utils';

const PlayerGameResults = () => {
  const { t } = useAppContext();
  const { gameResult, gameData, isLoadingResults, loadError, isAdmin } =
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
  const primaryColor = 'var(--color-primaryText)';
  const shortAdminWallet =
    gameData.admin_wallet?.slice(0, 4) +
    '...' +
    gameData.admin_wallet?.slice(-4);
  return (
    <Column className='gap-4 w-full'>
      <H2>{gameData.name}</H2>
      <Row className='gap-2'>
        <Label>{`${t('Created by')}:`}</Label>
        <Label
          style={{ color: primaryColor }}
        >{`${gameData.username} (${shortAdminWallet})`}</Label>
      </Row>

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
              <RiTimeLine size={28} color='var(--color-primaryText)' />
              <Label
                style={{ color: 'var(--color-primaryText)', marginBottom: -2 }}
              >
                {t('Waiting for game to end...')}
              </Label>
            </>
          )}
        </Row>
      </div>

      {/* Show player's personal results if they submitted answers */}
      {hasSubmittedAnswers && !isAdmin && (
        <Column className='gap-4 w-full'>
          <div className='p-4 rounded-lg shadow-xl text-center w-full bg-surface gap-4'>
            <H5>{t('Your Results')}</H5>
            <div className='flex flex-col md:flex-row justify-center gap-4 items-center md:items-start'>
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

              {gameEnded && (
                <div className='flex flex-col items-center'>
                  <H5>{gameResult?.xpEarned || 'N/A'}</H5>
                  <Label>{t('XP Earned')}</Label>
                </div>
              )}

              {gameEnded && gameResult.rewardsEarned && (
                <div className='flex flex-col items-center'>
                  <H5>{gameResult.rewardsEarned / LAMPORTS_PER_SOL} SOL</H5>
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
              <div className='text-sm text-gray'>
                {t(
                  'Additional rewards and ranking will be available when the game ends'
                )}
              </div>
            )}
          </div>
          {gameResult?.completedAt && (
            <Row className='gap-2'>
              <Label>{t('Total time taken')}:</Label>
              <Label>
                {formatDetailedGameTime(
                  gameData.start_time,
                  gameResult?.completedAt
                )}
              </Label>
            </Row>
          )}
        </Column>
      )}

      {/* Questions Review - always shown if player has submitted answers */}
      {hasSubmittedAnswers && !isAdmin && (
        <div className='space-y-4 w-full rounded-lg shadow-xl'>
          <H3>{t('Your Answers')}</H3>
          {gameResult.answeredQuestions.map((question, index) => (
            <div key={question.questionId} className='p-4'>
              <div className='flex items-start gap-4'>
                <div className='flex-shrink-0'>
                  {question.isCorrect ? (
                    <div className='w-8 h-8 rounded-full flex items-center justify-center'>
                      <RiCheckFill size={24} className='text-green' />
                    </div>
                  ) : (
                    <div className='w-8 h-8 rounded-full flex items-center justify-center'>
                      <RiCloseFill size={24} className='text-red' />
                    </div>
                  )}
                </div>
                <div className='flex-grow gap-4'>
                  <H3 className='text-lg font-semibold'>
                    {index + 1}. {question.questionText}
                  </H3>
                  <div className='space-y-2'>
                    {question.userAnswer && !question.isCorrect ? (
                      <div className='p-4 rounded-lg bg-red-50 border border-red'>
                        <Label className='font-medium'>
                          {t('Your answer')}:{' '}
                          <span className='inline-block w-6 h-6 rounded-full text-center leading-6 mr-[2px]'>
                            {question.userAnswer.displayLetter}
                          </span>
                          {question.userAnswer.text}
                        </Label>
                      </div>
                    ) : question.userAnswer && question.isCorrect ? null : (
                      <div className='p-4 rounded-lg border border-gray'>
                        <Label className='font-medium'>
                          {t('No answer provided')}
                        </Label>
                      </div>
                    )}
                    {/* Show correct answer for incorrect responses and while waiting */}
                    {/* {(!question.isCorrect || !gameEnded) && ( */}
                    <div className='p-4 rounded-lg bg-green-50 border border-green'>
                      <Label className='font-medium'>
                        {t('Correct answer')}:{' '}
                        <span className='inline-block w-6 h-6 rounded-full text-center leading-6 mr-[2px]'>
                          {question.correctAnswer.displayLetter}
                        </span>
                        {question.correctAnswer.text}
                      </Label>
                    </div>
                    {/* )} */}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard column - only shown if game has ended */}
      {gameEnded && (
        <Column className='w-full'>
          {/* Winners Section */}
          {winners.length > 0 && (
            <div className='p-4 rounded-lg shadow-lg w-full gap-4'>
              <H3>{t('Winners')}</H3>
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
                          {`${winner.username} (${winner.wallet.slice(
                            0,
                            4
                          )}...${winner.wallet.slice(-4)})`}
                          {winner.wallet === publicKey?.toString() && (
                            <span className='ml-2 text-primary'>
                              {t('(You)')}
                            </span>
                          )}
                        </Label>
                        <Label className='text-sm text-gray'>
                          {`${winner.numCorrect} ${t('correct')} - ${t(
                            'Finish time'
                          )}: ${formatDetailedGameTime(
                            gameData.start_time,
                            winner.finishTime
                          )}`}
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
            <div className='p-4 rounded-lg shadow-lg w-full gap-4'>
              <H3>{t('Leaderboard')}</H3>
              <div className='space-y-2'>
                {leaderboard.map((player) => (
                  <div
                    key={player.wallet}
                    className={`p-4 rounded-lg border ${
                      player.wallet === publicKey?.toString()
                        ? 'border-primary'
                        : 'border-gray'
                    }`}
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <div className='w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center'>
                          <Label className='font-medium'>#{player.rank}</Label>
                        </div>
                        <div>
                          <Label className='font-semibold'>
                            {`${player.username} (${player.wallet.slice(
                              0,
                              4
                            )}...${player.wallet.slice(-4)})`}
                            {player.wallet === publicKey?.toString() && (
                              <span className='ml-2 text-primary'>
                                {t('(You)')}
                              </span>
                            )}
                          </Label>
                          <Label className='text-sm text-gray'>
                            {`${player.numCorrect} ${t('correct')} - ${t(
                              'Finish time'
                            )}: ${formatDetailedGameTime(
                              gameData.start_time,
                              player.finishTime
                            )}`}
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
        <div className='w-full p-4 rounded-lg shadow-lg flex flex-col items-center justify-center'>
          <RiTimeLine size={48} className='text-secondaryText' />
          <H3 className='text-center'>{t('Waiting for game to end')}</H3>
          <SecondaryText className='text-center'>
            {t(
              'The admin will end the game shortly. Leaderboard and rewards will be available once the game has ended.'
            )}
          </SecondaryText>
        </div>
      )}

      {/* Share Results Button - only show when game has ended */}
      {gameEnded && hasSubmittedAnswers && (
        <Button
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
