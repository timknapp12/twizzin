'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Column, Row, Label, Input } from '@/components';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TbListDetails } from 'react-icons/tb';
import { GiSittingDog } from 'react-icons/gi';
import { useAppContext, useGameContext } from '@/contexts';
import { PartialGame } from '@/types';
import {
  formatGameTime,
  getRemainingTime,
  formatSupabaseDate,
  getCurrentConfig,
  GameState,
} from '@/utils';
import { toast } from 'react-toastify';

const { network } = getCurrentConfig();

const JoinGameDetails = ({
  partialGameData,
}: {
  partialGameData: PartialGame;
}) => {
  const { t, language } = useAppContext();
  const {
    username,
    setUsername,
    handleJoinGame,
    isAdmin,
    handleStartGame,
    gameState,
  } = useGameContext();

  const {
    game_code,
    name: game_name,
    entry_fee,
    commission_bps: commission,
    donation_amount,
    max_winners,
    start_time,
    end_time,
    question_count,
    all_are_winners,
    even_split,
    img_url,
    username: creator_username,
    admin_wallet,
  } = partialGameData || {};

  const totalTime =
    end_time && start_time ? formatGameTime(start_time, end_time) : 0;

  const [isLoading, setIsLoading] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [countdown, setCountdown] = useState<string>(
    getRemainingTime(start_time)
  );

  // Check if user has joined the game
  const hasJoinedGame = gameState === GameState.JOINED;

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getRemainingTime(start_time));
    }, 1000);

    return () => clearInterval(timer);
  }, [start_time]);

  const onJoinGame = async () => {
    setIsLoading(true);
    try {
      const signature = await handleJoinGame();
      if (signature) {
        toast.success(
          <div>
            {t('Game joined successfully!')}
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
      }
    } catch (error: unknown) {
      console.error('Error joining game:', error);
      if (error instanceof Error) {
        toast.error(`${t('Error joining game')}: ${error.message}`);
      } else {
        toast.error(t('Error joining game'));
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const router = useRouter();
  const onLeaveGame = async () => router.push(`/${language}/join`);

  const onStartGame = async () => {
    setIsStartingGame(true);
    try {
      await handleStartGame();
      toast.success(t('Game started successfully'));
    } catch (error: unknown) {
      console.error('Error starting game:', error);
      if (error instanceof Error) {
        toast.error(`${t('Error starting game')}: ${error.message}`);
      } else {
        toast.error(t('Error starting game'));
      }
      throw error;
    } finally {
      setIsStartingGame(false);
    }
  };

  const countDownText =
    countdown === 'Game has started!' && isAdmin
      ? t('The game is ready for you to start it')
      : countdown === 'Game has started!'
      ? t('Waiting for admin to start game...')
      : countdown;

  const primaryColor = 'var(--color-primaryText)';
  const errorColor = 'var(--color-error)';

  const shortAdminWallet =
    admin_wallet?.slice(0, 4) + '...' + admin_wallet?.slice(-4);

  return (
    <Column className='gap-4 w-full h-full flex-1 mt-2' justify='between'>
      <Column className='gap-4 w-full'>
        {hasJoinedGame ? (
          <div className='flex px-[10px] py-[6px] md:px-[14px] md:py-[10px] justify-center items-center self-stretch rounded-lg  bg-[#af9aec] gap-4 w-full max-w-small mx-auto  text-[14px] active:opacity-80'>
            <Row className='gap-2'>
              <GiSittingDog size={28} color='var(--color-primary)' />
              <Label style={{ color: 'white', marginBottom: -4 }}>
                {`${t('Waiting room for game')}: ${game_code}`}
              </Label>
            </Row>
          </div>
        ) : (
          <div className='flex px-[10px] py-[6px] md:px-[14px] md:py-[10px] justify-center items-center self-stretch rounded-lg  bg-[#FBF9E9] gap-4 w-full max-w-small mx-auto  text-[14px] active:opacity-80'>
            <Row className='gap-2'>
              <TbListDetails size={28} color='var(--color-tertiary)' />
              <Label style={{ marginBottom: -4 }}>{t('Game Code')}:</Label>
              <Label style={{ color: primaryColor, marginBottom: -4 }}>
                {game_code}
              </Label>
            </Row>
          </div>
        )}
        <Row className='gap-2'>
          {countdown !== 'Game has started!' ? (
            <Label>{t('Time till game starts')}:</Label>
          ) : null}
          <Label style={{ color: errorColor }}>{countDownText}</Label>
        </Row>
        {img_url && (
          <div className='relative w-full max-w-[200px] min-w-[120px] aspect-square mx-auto'>
            <Image
              src={img_url}
              alt='game image'
              fill
              className='object-contain'
              sizes='100vw'
              style={{ borderRadius: '10px' }}
            />
          </div>
        )}
        <Column className='gap-2 w-full p-4 rounded-lg shadow-xl bg-surface'>
          <Row className='gap-2'>
            <Label>{t('Game Title')}:</Label>
            <Label style={{ color: primaryColor }}>{game_name}</Label>
          </Row>
          <Row className='gap-2'>
            <Label>{`${t('Created by')}:`}</Label>
            <Label
              style={{ color: primaryColor }}
            >{`${creator_username} (${shortAdminWallet})`}</Label>
          </Row>
          <Row className='gap-2'>
            <Label>{t('Entry Fee')}:</Label>
            <Label style={{ color: primaryColor }}>
              {entry_fee ? entry_fee / LAMPORTS_PER_SOL : '0'} SOL
            </Label>
          </Row>
          <Row className='gap-2'>
            <Label>{t('Commission to game creator')}:</Label>
            <Label style={{ color: primaryColor }}>
              {commission ? commission / 100 : '0 '}%
            </Label>
          </Row>
          <Row className='gap-2'>
            <Label>{t('Donation to the pool by game creator')}:</Label>
            <Label style={{ color: primaryColor }}>
              {/* TODO - update to real symbol */}
              {donation_amount ? donation_amount / LAMPORTS_PER_SOL : '0'} SOL
            </Label>
          </Row>
          <Row className='gap-2'>
            <Label>{t('Maximum number of winners')}:</Label>
            <Label style={{ color: primaryColor }}>
              {all_are_winners ? 'All' : max_winners}
            </Label>
          </Row>
          <Row className='gap-2'>
            <Label>{t('Game start time')}:</Label>
            <Label style={{ color: primaryColor }}>
              {start_time ? formatSupabaseDate(start_time) : '-'}
            </Label>
          </Row>
          <Row className='gap-2'>
            <Label>{t('Number of questions')}:</Label>
            <Label style={{ color: primaryColor }}>{question_count}</Label>
          </Row>
          <Row className='gap-2'>
            <Label>{t('Total game time in seconds')}:</Label>
            <Label style={{ color: primaryColor }}>{totalTime}</Label>
          </Row>
          <Row className='gap-2'>
            <Label>{t('Split')}:</Label>
            <Label style={{ color: primaryColor }}>
              {even_split ? 'Evenly split among all winners' : 'Tiered'}
            </Label>
          </Row>
        </Column>
      </Column>
      <Column className='gap-4 w-full'>
        {!isAdmin && !hasJoinedGame && (
          <Input
            label={t('Username')}
            value={username}
            required
            maxLength={20}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t('Enter your username')}
          />
        )}
        {hasJoinedGame ? (
          <Button secondary onClick={onLeaveGame}>
            {t('Leave game')}
          </Button>
        ) : (
          <Button onClick={onJoinGame} isLoading={isLoading}>
            {t('Join game')}
          </Button>
        )}
        {hasJoinedGame && isAdmin && (
          <Button onClick={onStartGame} isLoading={isStartingGame}>
            {t('Start game')}
          </Button>
        )}
      </Column>
    </Column>
  );
};

export default JoinGameDetails;
