import React, { useState } from 'react';
import { Column, Row, Grid, Label, PrimaryText, H5 } from '@/components';
import { TbListDetails } from 'react-icons/tb';
import { FaCircleCheck, FaRegCopy, FaUsers } from 'react-icons/fa6';
import { useAppContext } from '@/contexts';
import { CreateGameData, QuestionForDb } from '@/types';
import { displayOrderMap } from '@/types';
import { toast } from 'react-toastify';
import { JoinedPlayersModal } from '@/components/modals';
import { useGameContext } from '../../contexts/GameContext';

interface DisplayAddedGameProps {
  gameData: CreateGameData;
  questions: QuestionForDb[];
  setIsEdit: React.Dispatch<React.SetStateAction<boolean>>;
}

const DisplayAddedGame: React.FC<DisplayAddedGameProps> = ({
  gameData,
  questions,
}) => {
  const { t } = useAppContext();
  const [isJoinedPlayersModalOpen, setIsJoinedPlayersModalOpen] =
    useState(false);
  const { currentPlayers } = useGameContext();

  const totalTime = questions.reduce(
    (acc, question) => acc + question.timeLimit,
    0
  );

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const getAnswerLetter = (displayOrder: number): string => {
    return displayOrderMap[displayOrder as keyof typeof displayOrderMap] || '';
  };

  const primaryColor = 'var(--color-primaryText)';
  const secondaryColor = 'var(--color-secondaryText)';

  const getBadgeSize = (count: number) => {
    if (count >= 100) return 'min-w-[24px] min-h-[24px] w-6 h-6';
    if (count >= 10) return 'min-w-[20px] min-h-[20px] w-5 h-5';
    return 'min-w-[16px] min-h-[16px] w-4 h-4';
  };

  return (
    <Column className='w-full h-full flex-grow' justify='between'>
      <Column className='w-full gap-4'>
        <Column className='w-full'>
          <Column className='w-full'>
            <div className='flex px-[10px] py-[6px] md:px-[14px] md:py-[10px] justify-center items-center self-stretch rounded-lg  bg-[#FBF9E9] gap-4 w-full max-w-small mx-auto md:text-[14px] active:opacity-80'>
              <Row className='gap-2'>
                <TbListDetails size={20} color='var(--color-tertiary)' />
                <Label style={{ marginBottom: '-2px' }}>
                  {t('Game Code')}:
                </Label>
                <Label style={{ color: primaryColor, marginBottom: '-2px' }}>
                  {gameData.gameCode}
                </Label>
                <FaRegCopy
                  size={14}
                  className='cursor-pointer hover:opacity-80 text-secondaryText'
                  // color='var(--color-tertiary)'
                  onClick={() => {
                    navigator.clipboard
                      .writeText(gameData.gameCode!)
                      .then(() =>
                        toast.success(t('Game code copied to clipboard'))
                      )
                      .catch(() => toast.error(t('Failed to copy game code')));
                  }}
                />
              </Row>
            </div>
          </Column>
        </Column>
        <Grid
          min='400px'
          gapSize='1rem'
          className='w-full p-4 bg-surface rounded-lg'
        >
          <Row>
            <Label className='mr-2'>{t('Game Title')}:</Label>
            <Label style={{ color: primaryColor }}>{gameData.gameName}</Label>
          </Row>
          <Row>
            <Label className='mr-2'>{t('Entry Fee')}:</Label>
            <Label style={{ color: primaryColor }}>
              {gameData.entryFee} SOL
            </Label>
          </Row>
          <Row>
            <Label className='mr-2'>{t('Commission')}:</Label>
            <Label style={{ color: primaryColor }}>
              {gameData.commission}%
            </Label>
          </Row>
          <Row>
            <Label className='mr-2'>
              {t('Donation to the pool by game creator')}:
            </Label>
            <Label style={{ color: primaryColor }}>
              {gameData.donation} SOL
            </Label>
          </Row>
          <Row>
            <Label className='mr-2'>{t('Number of Max Winners')}:</Label>
            <Label style={{ color: primaryColor }}>{gameData.maxWinners}</Label>
          </Row>
          <Row>
            <Label className='mr-2'>{t('Game start time')}:</Label>
            <Label style={{ color: primaryColor }}>
              {formatDate(gameData.startTime)}
            </Label>
          </Row>
          <Row className='gap-2'>
            <Label>{t('Number of questions')}:</Label>
            <Label style={{ color: primaryColor }}>{questions.length}</Label>
          </Row>
          <Row className='gap-2'>
            <Label>{t('Split')}:</Label>
            <Label style={{ color: primaryColor }}>
              {gameData.evenSplit ? 'Evenly split among all winners' : 'Tiered'}
            </Label>
          </Row>
        </Grid>
        <Row justify='between' className='w-full'>
          <div
            className='relative inline-block cursor-pointer'
            onClick={() => setIsJoinedPlayersModalOpen(true)}
          >
            <FaUsers
              size={20}
              title={t('View players')}
              className='cursor-pointer opacity-60 hover:opacity-80'
            />
            <div
              className={`absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full flex items-center justify-center font-semibold ${getBadgeSize(
                currentPlayers.length
              )}`}
            >
              {currentPlayers.length}
            </div>
          </div>
          <Row justify='end' className='pr-4'>
            <Label className='mr-2'>{t('Total game time in seconds')}:</Label>
            <Label style={{ color: primaryColor }}>{totalTime}</Label>
          </Row>
        </Row>

        <PrimaryText>{t('Questions')}</PrimaryText>
        <Column className='w-full gap-6'>
          {questions
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((question, index) => (
              <Column
                key={index}
                className='w-full gap-4 bg-surface p-4 rounded-lg'
              >
                <H5 style={{ color: secondaryColor }}>{`${t('Question')} ${
                  question.displayOrder + 1
                }`}</H5>
                <Label style={{ color: primaryColor }}>
                  {question.questionText}
                </Label>
                <div className='w-11/12 h-[1px] bg-lightPurple my-3 mx-auto' />
                <H5 style={{ color: secondaryColor }}>{t('Answers')}:</H5>
                {question.answers.map((answer, answerIndex) => (
                  <Row key={answerIndex} className='pl-4 items-center'>
                    <Label className='mr-2'>{`${getAnswerLetter(
                      answer.displayOrder
                    )}:`}</Label>
                    <Label style={{ color: primaryColor }}>
                      {answer.answerText}
                    </Label>
                    {answer.isCorrect && (
                      <FaCircleCheck
                        className='ml-2 mb-1 text-green'
                        size={16}
                      />
                    )}
                  </Row>
                ))}
                <div className='w-11/12 h-[1px] bg-lightPurple my-3 mx-auto' />
                <Row>
                  <Label className='mr-2'>{t('Time Limit')}:</Label>
                  <Label style={{ color: primaryColor }}>
                    {question.timeLimit} {t('seconds')}
                  </Label>
                </Row>
              </Column>
            ))}
        </Column>
      </Column>

      <JoinedPlayersModal
        isOpen={isJoinedPlayersModalOpen}
        onClose={() => setIsJoinedPlayersModalOpen(false)}
      />
    </Column>
  );
};

export default DisplayAddedGame;
