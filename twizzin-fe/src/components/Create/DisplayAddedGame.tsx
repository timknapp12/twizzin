import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Column,
  Row,
  Grid,
  Label,
  LabelSecondary,
  H3,
  Alert,
  H5,
  IconButton,
} from '@/components';
import { GameData, QuestionForDb } from '@/types';
import { displayOrderMap } from '@/types';
import { FaPencil, FaCircleCheck } from 'react-icons/fa6';

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
  setShowGameCode,
  setIsEdit,
}) => {
  const { t } = useTranslation();

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

  const onEdit = () => {
    setShowGameCode(false);
    setIsEdit(true);
  };

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
              onClose={() => setShowGameCode(false)}
            />
          )}
          <Row className='w-full' justify='end'>
            <IconButton
              Icon={FaPencil}
              onClick={onEdit}
              title={t('Edit')}
              className='cursor-pointer'
              size={20}
            />
          </Row>
          <H3>{t('Game Details')}</H3>
          <Row>
            <Label className='mr-2 mb-0'>{t('Game Code')}:</Label>
            <LabelSecondary className='mb-0'>
              {gameData.gameCode}
            </LabelSecondary>
          </Row>
        </Column>
        <Grid
          min='400px'
          gapSize='1rem'
          className='w-full p-4 bg-offWhite dark:bg-lightBlack rounded-lg'
        >
          <Row>
            <Label className='mr-2'>{t('Game Title')}:</Label>
            <LabelSecondary>{gameData.gameName}</LabelSecondary>
          </Row>
          <Row>
            <Label className='mr-2'>{t('Entry Fee')}:</Label>
            <LabelSecondary>{gameData.entryFee} SOL</LabelSecondary>
          </Row>
          <Row>
            <Label className='mr-2'>{t('Commission')}:</Label>
            <LabelSecondary>{gameData.commission}%</LabelSecondary>
          </Row>
          <Row>
            <Label className='mr-2'>{t('Admin donation to the pool')}:</Label>
            <LabelSecondary>{gameData.donation} SOL</LabelSecondary>
          </Row>
          <Row>
            <Label className='mr-2'>{t('Number of Max Winners')}:</Label>
            <LabelSecondary>{gameData.maxWinners}</LabelSecondary>
          </Row>
          <Row>
            <Label className='mr-2'>{t('Game start time')}:</Label>
            <LabelSecondary>{formatDate(gameData.startTime)}</LabelSecondary>
          </Row>
        </Grid>

        <Row justify='end' className='w-full pr-4'>
          <Label className='mr-2'>{t('Total game time in seconds')}:</Label>
          <LabelSecondary>{totalTime}</LabelSecondary>
        </Row>

        <H3>{t('Questions')}</H3>
        <Column className='w-full gap-6'>
          {questions
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((question, index) => (
              <Column
                key={index}
                className='w-full gap-4 bg-offWhite dark:bg-lightBlack p-4 rounded-lg'
              >
                <H5>{`${t('Question')} ${question.displayOrder + 1}`}</H5>
                <LabelSecondary>{question.question}</LabelSecondary>
                <div className='w-11/12 h-[1px] bg-lightPurple my-3 mx-auto' />
                <H5>{t('Answers')}:</H5>
                {question.answers.map((answer, answerIndex) => (
                  <Row key={answerIndex} className='pl-4 items-center'>
                    <Label className='mr-2'>{`${getAnswerLetter(
                      answer.displayOrder
                    )}:`}</Label>
                    <LabelSecondary>{answer.answerText}</LabelSecondary>
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
                  <H5 className='mr-2'>{t('Time Limit')}:</H5>
                  <LabelSecondary style={{ marginBottom: '0px' }}>
                    {question.timeLimit} {t('seconds')}
                  </LabelSecondary>
                </Row>
              </Column>
            ))}
        </Column>
      </Column>
    </Column>
  );
};

export default DisplayAddedGame;
