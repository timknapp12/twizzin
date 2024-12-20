import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { useCreateGameContext } from '@/contexts/CreateGameContext';
import {
  Column,
  Input,
  Grid,
  Label,
  Row,
  IconButton,
  Button,
  Alert,
  Callout,
  FileInput,
} from '@/components';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import AddUpdateQuestion from './AddUpdateQuestion';
import DisplayAddedGame from './DisplayAddedGame';
import { FaPlus } from 'react-icons/fa6';
import { GiBrain } from 'react-icons/gi';
import { validateGame } from '@/utils';
import { useScreenSize } from '@/hooks/useScreenSize';
// import { createGameWithQuestions } from '@/utils/supabase/createGame';

const AddUpdateGame = () => {
  const { t } = useAppContext();
  const {
    gameData,
    handleGameData,
    questions,
    handleAddBlankQuestion,
    // handleCreateGame,
  } = useCreateGameContext();

  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const screenSize = useScreenSize();
  const adjustedMin = screenSize === 'small' ? '100%' : '200px';

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isEdit, setIsEdit] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showGameCode, setShowGameCode] = useState(false);

  const doesGameCodeExist = gameData.gameCode && gameData.gameCode.length > 0;
  // console.log('doesGameCodeExist', doesGameCodeExist);
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

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleFileError = (error: string) => {
    setError(error);
  };
  console.log('selectedFile', selectedFile);

  // const generateGameCode = (): string => {
  //   const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  //   let result = '';
  //   for (let i = 0; i < 6; i++) {
  //     const randomIndex = Math.floor(Math.random() * characters.length);
  //     result += characters.charAt(randomIndex);
  //   }
  //   return result;
  // };

  // TODO - add more validations
  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      if (!publicKey || !connection) {
        throw new Error(t('Please connect your wallet'));
      }

      const validationError = validateGame(gameData, questions);
      if (validationError) {
        throw new Error(validationError);
      }

      // const result = await createGameWithQuestions(
      //   gameData,
      //   questions,
      //   selectedFile
      // );
      // console.log('Game created successfully:', result);

      // await handleCreateGame(program, wallet, params);

      setIsLoading(false);
      setIsEdit(false);
      setShowGameCode(true);
    } catch (error: any) {
      console.error('Failed to create game:', error);
      setError(error.message);
      setIsLoading(false);
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
        <div className='flex px-[10px] py-[6px] md:px-[14px] md:py-[10px] justify-center items-center self-stretch rounded-lg bg-[#E8F7EA] gap-4 w-full max-w-small mx-auto  text-[10px] text-[#655B30] md:text-[14px] active:opacity-80'>
          <Row className='gap-2'>
            <GiBrain size={20} className='text-green' />
            {doesGameCodeExist
              ? `${t('Update game')}: ${gameData.gameCode}`
              : t('Create a Twizzin game')}
          </Row>
        </div>
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
            placeholder={t('Entry Fee')}
            label={t('Entry Fee')}
            callout={
              <Callout
                content={t(
                  'Entry fee is the amount each player must pay to enter the game (optional)'
                )}
                position='left'
              />
            }
          />
          <Input
            type='number'
            name='commission'
            value={gameData.commission}
            onChange={handleInputChange}
            placeholder={t('Commission 0-10%')}
            label={t('Commission 0-10%')}
            min={0}
            max={10}
            callout={
              <Callout
                content={t(
                  'Commission is the percentage of the pot that you, the game admin, will receive (optional)'
                )}
                position='left'
              />
            }
          />
          <Input
            type='number'
            name='donation'
            value={gameData.donation}
            onChange={handleInputChange}
            placeholder={t('Admin donation to the pool')}
            label={t('Admin donation to the pool')}
            callout={
              <Callout
                content={t(
                  'Admin donation is the amount that you, the game admin, will donate to the pot (optional)'
                )}
                position='left'
              />
            }
          />
          <Input
            type='number'
            name='maxWinners'
            value={gameData.maxWinners}
            onChange={handleInputChange}
            placeholder={t('Number of Max Winners')}
            label={t('Number of Max Winners')}
            min={1}
            callout={
              <Callout
                content={t(
                  'The number of winners that will be paid out in the game (1-200)'
                )}
                position='left'
              />
            }
          />
          <Column className='w-full' align='start'>
            <Label>{t('Game start time')}</Label>
            <div className='w-full'>
              <DatePicker
                name='startTime'
                selected={gameData.startTime}
                onChange={handleDateChange}
                showTimeSelect
                className='w-full min-w-[200px] px-4 py-1 border border-disabledText rounded-md focus:outline-none focus:ring-2 focus:ring-secondaryText focus:border-transparent bg-light-background dark:bg-dark-background'
                placeholderText='Select date and time'
                dateFormat='Pp'
                wrapperClassName='w-full'
              />
            </div>
          </Column>
          <FileInput
            label={t('Upload image')}
            accept='image/jpeg,image/png,image/webp'
            onFileSelect={handleFileSelect}
            onError={handleFileError}
            callout={
              <Callout
                content={t('Upload an image to use as the game cover image')}
                position='left'
              />
            }
          />
        </Grid>

        <div className='h-4' />
        <Row justify='end' className='w-full pr-4'>
          <Label className='mr-2'>{`${t(
            'Total game time in seconds'
          )}:`}</Label>
          <Label>{totalTime}</Label>
        </Row>
        <Column className='w-full gap-6'>
          {questions
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((question) => (
              <AddUpdateQuestion
                key={question.displayOrder}
                questionFromParent={question}
                setError={setError}
              />
            ))}
        </Column>
      </Column>
      <Row className='w-full' justify='end'>
        <div className='flex items-center justify-center rounded-full bg-primary'>
          <IconButton
            Icon={FaPlus}
            onClick={handleAddBlankQuestion}
            title={t('Add question')}
            className='cursor-pointer text-white'
            size={24}
          />
        </div>
      </Row>
      <Column className='w-full gap-4'>
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
