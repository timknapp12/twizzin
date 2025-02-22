import React, { useState } from 'react';
import { useAppContext, useCreateGameContext } from '@/contexts';
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
  Checkbox,
} from '@/components';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import AddUpdateQuestion from './AddUpdateQuestion';
import DisplayAddedGame from './DisplayAddedGame';
import { FaPlus } from 'react-icons/fa6';
import { GiBrain } from 'react-icons/gi';
import { getCurrentConfig, validateGame } from '@/utils';
import { useScreenSize } from '@/hooks/useScreenSize';
import { GameDataChangeEvent } from '@/types';
import { toast } from 'react-toastify';

const { network } = getCurrentConfig();
const AddUpdateGame = () => {
  const { t } = useAppContext();
  const {
    gameData,
    handleGameData,
    questions,
    handleAddBlankQuestion,
    totalTime,
    handleCreateGame,
    isCreating,
    error: createError,
    creationResult,
    clearError,
    handleImageChange,
  } = useCreateGameContext();

  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const screenSize = useScreenSize();
  const adjustedMin = screenSize === 'small' ? '100%' : '200px';

  const [isEdit, setIsEdit] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showGameCode, setShowGameCode] = useState(false);

  const doesGameCodeExist = gameData.gameCode && gameData.gameCode.length > 0;
  // console.log('doesGameCodeExist', doesGameCodeExist);
  const handleDateChange = (date: Date | null) => {
    setError(null);
    handleGameData({
      target: {
        name: 'startTime',
        value: date || new Date(),
        type: 'date',
      },
    } as unknown as GameDataChangeEvent);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearError();
    setError(null);
    const { name, value, type } = e.target;

    if (type === 'number') {
      const parsedValue = parseFloat(value);
      const finalValue = isNaN(parsedValue) ? 0 : parsedValue;
      handleGameData({
        target: { name, value: finalValue, type: 'number' },
      } as { target: { name: string; value: number | string; type: string } });
    } else {
      handleGameData(e);
    }
  };

  const [imageError, setImageError] = useState<string | null>(null);
  const fileSizeError = t('File size must be less than 5MB');
  const fileTypeError = t('File must be a JPEG, PNG, or WebP image');

  const handleFileSelect = (file: File) => {
    setImageError(null);
    handleImageChange(file);
  };

  const handleFileUploadComplete = (processedFile: File) => {
    setImageError(null);
    handleImageChange(processedFile);
  };

  const handleFileError = (error: string) => {
    setImageError(error);
    handleImageChange(null);
  };

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

      const result = await handleCreateGame();

      // Check creationResult from context
      if (result) {
        const gameCode = result.database.game.game_code;
        const signature = result.onChain.signature;
        toast.success(
          <div>
            {`${t('Game created successfully!')} ${t(
              'Save this code to share with players:'
            )} `}
            <span className='text-red font-bold'>{gameCode}</span>
            <a
              href={`https://explorer.solana.com/tx/${signature}?cluster=${network}`}
              target='_blank'
              rel='noopener noreferrer'
              className='text-secondary hover:text-primary ml-2'
            >
              {t('View transaction')}
            </a>
          </div>,
          {
            autoClose: false,
          }
        );
        setIsEdit(false);
        // setShowGameCode(true);
      }
    } catch (error: any) {
      console.error('Failed to create game AddUpdateGame:', error);
      setError(error.message);
    } finally {
      // Always set loading to false, regardless of success or failure
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
      <Column className='w-full'>
        <div className='flex px-[10px] py-[6px] md:px-[14px] md:py-[10px] justify-center items-center self-stretch rounded-lg bg-[#E8F7EA] gap-4 w-full max-w-small mx-auto  text-[16px] text-[#655B30] active:opacity-80'>
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
            <Row className='gap-2 items-center w-full justify-between'>
              <Label>{t('Game start time')}</Label>
              <Callout
                content={t(
                  `This will help players know when to join the game but it won't start until you manually start it`
                )}
                position='left'
              />
            </Row>
            <div className='w-full'>
              {gameData && (
                <DatePicker
                  name='startTime'
                  selected={gameData.startTime}
                  onChange={handleDateChange}
                  showTimeSelect
                  className='w-full min-w-[200px] px-4 py-1 border border-disabledText rounded-md focus:outline-none focus:ring-2 focus:ring-secondaryText focus:border-transparent bg-light-background dark:bg-dark-background'
                  placeholderText={t('Select date and time')}
                  dateFormat='Pp'
                  wrapperClassName='w-full'
                />
              )}
            </div>
          </Column>
          <FileInput
            label={t('Upload image')}
            accept='image/jpeg,image/png,image/webp'
            onFileSelect={handleFileSelect}
            onError={handleFileError}
            onUploadComplete={handleFileUploadComplete}
            fileSizeError={fileSizeError}
            fileTypeError={fileTypeError}
            callout={
              <Callout
                content={t('Upload an image to use as the game cover image')}
                position='left'
              />
            }
          />
          {imageError && (
            <Alert
              variant='error'
              title={t('Error')}
              description={imageError}
              onClose={() => setImageError(null)}
            />
          )}
        </Grid>

        <Row className='px-4'>
          <Checkbox
            name='evenSplit'
            checked={gameData.evenSplit}
            onChange={handleGameData}
            label={t('Split the winnings evenly among winners')}
            callout={
              <Callout
                content={t(
                  'If checked, the winnings will be rewarded evenly among winners, rather than on a tiered system based on rankings'
                )}
                position='left'
              />
            }
          />
          <Checkbox
            name='allAreWinners'
            checked={gameData.allAreWinners}
            onChange={handleGameData}
            label={t('Make all players winners')}
            callout={
              <Callout
                content={t(
                  'If checked, all players will be winners and override the number of maximum winners set above'
                )}
                position='left'
              />
            }
          />
        </Row>

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
        {createError && (
          <Alert
            variant='error'
            title={t('Error')}
            description={createError}
            onClose={clearError}
          />
        )}

        {!doesGameCodeExist && (
          <Button onClick={handleSubmit} isLoading={isLoading || isCreating}>
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
