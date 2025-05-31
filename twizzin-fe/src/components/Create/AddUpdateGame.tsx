import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAppContext, useCreateGameContext } from '@/contexts';
import {
  Column,
  Input,
  Grid,
  Label,
  Row,
  IconButton,
  Button,
  Callout,
  FileInput,
  Checkbox,
} from '@/components';
import { FaSpinner } from 'react-icons/fa6';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import AddUpdateQuestion from './AddUpdateQuestion';
import { FaPlus } from 'react-icons/fa6';
import { GiBrain } from 'react-icons/gi';
import { getCurrentConfig, validateGame, getGameFromDb } from '@/utils';
import { useScreenSize } from '@/hooks/useScreenSize';
import { GameDataChangeEvent } from '@/types';
import { toast } from 'react-toastify';
import bot from '../../assets/svgs/Bots--Streamline-Manila.svg';

const { network } = getCurrentConfig();

interface AddUpdateGameProps {
  gameCode?: string;
  setIsDisplayGame?: () => void;
}

const AddUpdateGame: React.FC<AddUpdateGameProps> = ({
  gameCode,
  setIsDisplayGame,
}) => {
  const { t, language } = useAppContext();
  const router = useRouter();
  const {
    gameData,
    handleGameData,
    questions,
    handleAddBlankQuestion,
    totalTime,
    handleCreateGame,
    isCreating,
    clearError,
    handleImageChange,
    formatAndUpdateGameData,
    resetForm,
  } = useCreateGameContext();

  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const screenSize = useScreenSize();
  const adjustedMin = screenSize === 'small' ? '100%' : '200px';

  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingGame, setIsFetchingGame] = useState(false);

  // Determine if we're in edit mode based on gameCode prop
  const isEditMode = !!gameCode;

  useEffect(() => {
    // Only reset the form when not in edit mode and not fetching game
    if (!isEditMode && !gameCode) {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, gameCode]);

  const hasLoadedRef = useRef(false);

  const fetchGameData = useCallback(async () => {
    if (!isEditMode || !gameCode) return;

    setIsFetchingGame(true);
    try {
      hasLoadedRef.current = true;
      const fullGameData = await getGameFromDb(gameCode);

      if (!fullGameData) {
        toast.error(t('Game not found'));
        return;
      }

      // Use the context function to update game data
      formatAndUpdateGameData(fullGameData);
    } catch (error: any) {
      console.error('Error fetching game for editing:', error);
      hasLoadedRef.current = false;
      toast.error(t('Failed to load game data for editing'));
    } finally {
      setIsFetchingGame(false);
    }
  }, [gameCode, isEditMode, t, formatAndUpdateGameData]);

  // Effect to fetch game data when in edit mode
  useEffect(() => {
    if (!isEditMode || !gameCode || hasLoadedRef.current) return;
    fetchGameData();
  }, [gameCode, isEditMode, fetchGameData]);

  const doesGameCodeExist = gameData.gameCode && gameData.gameCode.length > 0;

  const handleDateChange = (date: Date | null) => {
    clearError();
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
    const { name, value, type } = e.target;

    if (type === 'number') {
      // Allow empty string when input is cleared
      if (value === '') {
        handleGameData({
          target: { name, value: '', type: 'number' },
        } as { target: { name: string; value: string | number; type: string } });
      } else {
        const parsedValue = parseFloat(value);
        const finalValue = isNaN(parsedValue) ? 0 : parsedValue;
        handleGameData({
          target: { name, value: finalValue, type: 'number' },
        } as { target: { name: string; value: number | string; type: string } });
      }
    } else {
      handleGameData(e);
    }
  };

  const fileSizeError = t('File size must be less than 5MB');
  const fileTypeError = t('File must be a JPEG, PNG, or WebP image');

  const handleFileSelect = (file: File) => {
    handleImageChange(file);
  };

  const handleFileUploadComplete = (processedFile: File) => {
    handleImageChange(processedFile);
  };

  // Handle both create and update
  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      if (!publicKey || !connection) {
        throw new Error(t('Please connect your wallet'));
      }

      // Convert empty strings to 0 for number fields before validation
      const gameDataForValidation = {
        ...gameData,
        entryFee:
          typeof gameData.entryFee === 'string' && gameData.entryFee === ''
            ? 0
            : Number(gameData.entryFee),
        donation:
          typeof gameData.donation === 'string' && gameData.donation === ''
            ? 0
            : Number(gameData.donation),
        commission:
          typeof gameData.commission === 'string' && gameData.commission === ''
            ? 0
            : Number(gameData.commission),
        maxWinners:
          typeof gameData.maxWinners === 'string' && gameData.maxWinners === ''
            ? 1
            : Number(gameData.maxWinners),
      };

      const validationError = validateGame(gameDataForValidation, questions);
      if (validationError) {
        throw new Error(validationError);
      }

      const result = await handleCreateGame();

      if (result) {
        const gameCode = result.database.game.game_code;
        const signature = result.onChain.signature;

        toast.success(
          <div>
            {`${
              isEditMode
                ? t('Game updated successfully!')
                : `${t('Game created successfully!')} ${t(
                    'Save this code to share with players:'
                  )}`
            }`}
            <span className='text-red font-bold ml-[6px]'>{gameCode}</span>
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
            autoClose: isEditMode ? 3000 : false,
          }
        );

        // Only proceed with navigation/display changes after state is updated
        if (isEditMode) {
          setIsDisplayGame?.();
        } else {
          router.push(`/${language}/creator/game/${gameCode}`);
        }
      }
    } catch (error: any) {
      console.error(
        `Failed to ${isEditMode ? 'update' : 'create'} game:`,
        error
      );
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const onCancelUpdate = () => {
    if (isEditMode) {
      setIsDisplayGame?.();
    } else {
      router.push('/');
    }
  };

  if (isFetchingGame) {
    return (
      <Column className='w-full h-64 items-center justify-center'>
        <FaSpinner className='animate-spin' size={28} />
        <div className='mt-4'>{t('Loading game data...')}</div>
      </Column>
    );
  }

  return (
    <Column className='w-full h-full flex-grow gap-12' justify='between'>
      <Column className='w-full'>
        <div className='flex px-[10px] py-[6px] md:px-[14px] md:py-[10px] justify-center items-center self-stretch rounded-lg bg-[#E8F7EA] gap-4 w-full max-w-small mx-auto text-[14px] text-green active:opacity-80'>
          <Row className='gap-2'>
            <GiBrain size={20} />
            {doesGameCodeExist || isEditMode
              ? `${t('Update game')}: ${gameData.gameCode || gameCode}`
              : t('Create a Twizzin game')}
          </Row>
        </div>
        <Image
          src={bot}
          alt='create game bot'
          style={{ height: 150, width: 150, paddingTop: 12 }}
          priority
        />
        <Grid min={adjustedMin} gapSize='1rem' className='w-full p-4'>
          <Input
            type='text'
            name='username'
            value={gameData.username}
            onChange={handleInputChange}
            placeholder={t('Your username')}
            label={`${t('Your username')}*`}
          />
          <Input
            type='text'
            name='gameName'
            value={gameData.gameName}
            onChange={handleInputChange}
            placeholder={t('Game Title')}
            label={`${t('Game Title')}*`}
          />
          <Input
            type='number'
            name='entryFee'
            value={gameData.entryFee}
            onChange={handleInputChange}
            placeholder={t('Player entry fee')}
            label={t('Player entry fee')}
            min={0}
            callout={
              <Callout
                content={t(
                  'Player entry fee is the amount each player must pay to enter the game (optional)'
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
            placeholder={t('Donation to the pool by you')}
            label={t('Donation to the pool by you')}
            min={0}
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
            label={`${t('Number of Max Winners')}*`}
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
              <Label>{`${t('Game start time')}*`}</Label>
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
        {!doesGameCodeExist && !isEditMode && (
          <Button onClick={handleSubmit} isLoading={isLoading || isCreating}>
            {t('Create Game')}
          </Button>
        )}
      </Column>
      {(doesGameCodeExist || isEditMode) && (
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
