import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import {
  Column,
  Input,
  H3,
  Grid,
  Label,
  Row,
  LabelSecondary,
  IconButton,
  Button,
  Alert,
  WalletButton,
} from '@/components';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import QuestionGroup from './QuestionGroup';
import DisplayAddedGame from './DisplayAddedGame';
import { FaPlus } from 'react-icons/fa6';
import { useTranslation } from 'react-i18next';
import { validateGame } from '@/utils';
import { useScreenSize } from '@/hooks/useScreenSize';

const AddUpdateGame = () => {
  const { gameData, handleGameData, questions, handleAddBlankQuestion } =
    useAppContext();
  const { t } = useTranslation();

  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const screenSize = useScreenSize();
  console.log('screenSize', screenSize);
  const adjustedMin = screenSize === 'small' ? '100%' : '400px';

  const [isEdit, setIsEdit] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showGameCode, setShowGameCode] = useState(false);

  const doesGameCodeExist = gameData.gameCode && gameData.gameCode.length > 0;
  console.log('doesGameCodeExist', doesGameCodeExist);
  const handleDateChange = (date: Date | null) => {
    setError(null);
    if (date) {
      handleGameData({
        target: { name: 'startTime', value: date.toISOString() },
      } as React.ChangeEvent<HTMLInputElement>);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const { name, value, type } = e.target;

    if (type === 'number') {
      const parsedValue = parseInt(value, 10);
      const finalValue = isNaN(parsedValue) ? 0 : parsedValue;
      handleGameData({
        target: { name, value: finalValue },
      } as { target: { name: string; value: number | string } });
    } else {
      handleGameData(e);
    }
  };

  const totalTime = questions.reduce(
    (acc, question) => acc + question.timeLimit,
    0
  );

  const generateGameCode = (): string => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
    }
    return result;
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    if (!publicKey || !connection) {
      setIsLoading(false);
      return setError('Please connect your wallet');
    }
    const validationError = validateGame(gameData, questions);

    if (validationError) {
      setError(validationError);
      setIsLoading(false);
    } else {
      setError(null);
      console.log('Game creation validated, proceeding with submission');

      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (!gameData.gameCode) {
        const gameCode = generateGameCode();
        handleGameData({
          target: { name: 'gameCode', value: gameCode },
        });
        setShowGameCode(true);
      }

      setIsLoading(false);
      setIsEdit(false);
    }
  };

  const onCancelUpdate = () => setIsEdit(false);

  if (!isEdit) {
    return (
      <DisplayAddedGame
        gameData={gameData}
        questions={questions}
        showGameCode={showGameCode}
        setShowGameCode={setShowGameCode}
        setIsEdit={setIsEdit}
      />
    );
  }

  return (
    <Column className='w-full h-full flex-grow gap-12' justify='between'>
      <Column className='w-full gap-4'>
        <Row className='w-full items-center flex-col lg:flex-row lg:justify-between'>
          <div className='lg:w-[300px] mb-4 lg:mb-0 order-first lg:order-last'>
            <WalletButton className='w-full' />
          </div>
          <H3 className='flex-1 text-center mb-4 lg:mb-0 lg:absolute lg:left-1/2 lg:transform lg:-translate-x-1/2'>
            {doesGameCodeExist
              ? `${t('Update game')}: ${gameData.gameCode}`
              : t('Create a Twizzin game')}
          </H3>
          <div className='hidden lg:block w-[300px]' />
        </Row>
        <Grid min={adjustedMin} gapSize='1rem' className='w-full p-4'>
          <Input
            type='text'
            name='gameName'
            value={gameData.gameName}
            onChange={handleInputChange}
            placeholder={t('Game Title')}
            label={t('Game Title')}
          />
          <Input
            type='number'
            name='entryFee'
            value={gameData.entryFee}
            onChange={handleInputChange}
            placeholder={`${t('Entry Fee')} (SOL)`}
            label={`${t('Entry Fee')} (SOL)`}
          />
          <Input
            type='number'
            name='commission'
            value={gameData.commission}
            onChange={handleInputChange}
            placeholder={t('Commission in %')}
            label={t('Commission in %')}
          />
          <Input
            type='number'
            name='donation'
            value={gameData.donation}
            onChange={handleInputChange}
            placeholder={t('Admin donation to the pool')}
            label={`${t('Admin donation to the pool')} (SOL)`}
          />
          <Input
            type='number'
            name='maxWinners'
            value={gameData.maxWinners}
            onChange={handleInputChange}
            placeholder={t('Number of Max Winners')}
            label={t('Number of Max Winners')}
          />
          <Column className='w-full' align='start'>
            <Label>{t('Game start time')}</Label>
            <div className='w-full'>
              <DatePicker
                name='startTime'
                selected={gameData.startTime}
                onChange={handleDateChange}
                showTimeSelect
                className='w-full min-w-[200px] px-4 py-2 border border-lightPurple rounded-md focus:outline-none focus:ring-2 focus:ring-darkPurple focus:border-transparent bg-light-background dark:bg-dark-background'
                placeholderText='Select date and time'
                dateFormat='Pp'
                wrapperClassName='w-full'
              />
            </div>
          </Column>
        </Grid>

        <div className='h-4' />
        <Row justify='end' className='w-full pr-4'>
          <Label className='mr-2'>{`${t(
            'Total game time in seconds'
          )}:`}</Label>
          <LabelSecondary>{totalTime}</LabelSecondary>
        </Row>
        <Column className='w-full gap-6'>
          {questions
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((question) => (
              <QuestionGroup
                key={question.displayOrder}
                questionFromParent={question}
                setError={setError}
              />
            ))}
        </Column>
      </Column>
      <Row className='w-full p-4' justify='end'>
        <IconButton
          Icon={FaPlus}
          onClick={handleAddBlankQuestion}
          title={t('Add question')}
          className='cursor-pointer text-blue'
          size={32}
        />
      </Row>
      <Column className='w-[50%] min-w-[200px] max-w-[400px]'>
        {error && (
          <Alert
            variant='error'
            title={t('Error')}
            description={error}
            onClose={() => setError(null)}
          />
        )}

        {!doesGameCodeExist && (
          <Button onClick={handleSubmit} isLoading={isLoading}>
            {t('Create Game')}
          </Button>
        )}
      </Column>
      {doesGameCodeExist && isEdit && (
        <Column className='w-[80%]'>
          <Row justify='between' className='w-full gap-4'>
            <Button onClick={onCancelUpdate} className='flex-1' secondary>
              {t('Cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              isLoading={isLoading}
              className='flex-1'
            >
              {t('Update Game')}
            </Button>
          </Row>
        </Column>
      )}
    </Column>
  );
};

export default AddUpdateGame;
