import React from 'react';
import {
  Column,
  Row,
  Grid,
  Label,
  PrimaryText,
  Alert,
  H5,
  // IconButton,
} from '@/components';
import { TbListDetails } from 'react-icons/tb';
import {
  // FaPencil,
  FaCircleCheck,
} from 'react-icons/fa6';
import { useAppContext, useCreateGameContext } from '@/contexts';
import { GameData, QuestionForDb } from '@/types';
import { displayOrderMap } from '@/types';

interface DisplayAddedGameProps {
  gameData: GameData;
  questions: QuestionForDb[];
  showGameCode: boolean;
  setShowGameCode: React.Dispatch<React.SetStateAction<boolean>>;
  setIsEdit: React.Dispatch<React.SetStateAction<boolean>>;
}

const DisplayAddedGame: React.FC<DisplayAddedGameProps> = ({
  gameData,
  questions,
  showGameCode,
  // setShowGameCode,
  // setIsEdit,
}) => {
  const { t } = useAppContext();
  const { creationResult } = useCreateGameContext();
  console.log('creationResult', creationResult);
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

  // const onEdit = () => {
  //   setShowGameCode(false);
  //   setIsEdit(true);
  // };

  const primaryColor = 'var(--color-primaryText)';
  const secondaryColor = 'var(--color-secondaryText)';

  return (
    <Column className='w-full h-full flex-grow gap-8' justify='between'>
      <Column className='w-full gap-2'>
        <Column className='w-full gap-0'>
          {showGameCode && (
            <Alert
              className='max-w-[500px]'
              variant='success'
              title={t('Your game is saved!')}
              description={`${t('Game Code')}: ${gameData.gameCode} `}
              // onClose={() => setShowGameCode(false)}
            />
          )}
          {/* <Row className='w-full' justify='end'>
            <IconButton
              Icon={FaPencil}
              onClick={onEdit}
              title={t('Edit')}
              className='cursor-pointer'
              size={20}
            />
          </Row> */}
          <Column className='w-full gap-4'>
            <div className='flex px-[10px] py-[6px] md:px-[14px] md:py-[10px] justify-center items-center self-stretch rounded-lg  bg-[#FBF9E9] gap-4 w-full max-w-small mx-auto  text-[10px] md:text-[14px] active:opacity-80'>
              <Row className='gap-2'>
                <TbListDetails size={20} color='var(--color-tertiary)' />
                {t('Game Details')}
              </Row>
            </div>
            <Row className='gap-2'>
              <Label>{t('Game Code')}:</Label>
              <Label style={{ color: primaryColor }}>{gameData.gameCode}</Label>
            </Row>
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
            <Label className='mr-2'>{t('Admin donation to the pool')}:</Label>
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
        </Grid>

        <Row justify='end' className='w-full pr-4'>
          <Label className='mr-2'>{t('Total game time in seconds')}:</Label>
          <Label style={{ color: primaryColor }}>{totalTime}</Label>
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
    </Column>
  );
};

export default DisplayAddedGame;
