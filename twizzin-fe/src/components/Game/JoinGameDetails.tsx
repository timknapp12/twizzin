'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button, Column, Row, Label, Alert } from '@/components';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TbListDetails } from 'react-icons/tb';
import { GiSittingDog } from 'react-icons/gi';
import { useAppContext, useGameContext } from '@/contexts';
import { PartialGame } from '@/types';
import { formatGameTime, getRemainingTime, formatSupabaseDate } from '@/utils';
import { useEffect, useState } from 'react';

const JoinGameDetails = ({
  partialGameData,
}: {
  partialGameData: PartialGame;
}) => {
  const { t, language } = useAppContext();
  const { handleJoinGame, gameData, isAdmin, setIsGameStarted } =
    useGameContext();

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
  } = partialGameData || {};

  const totalTime =
    end_time && start_time ? formatGameTime(start_time, end_time) : 0;

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState<string>(
    getRemainingTime(start_time)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getRemainingTime(start_time));
    }, 1000);

    return () => clearInterval(timer);
  }, [start_time]);

  const onJoinGame = async () => {
    setIsLoading(true);
    try {
      await handleJoinGame();
    } catch (error: unknown) {
      console.error('Error joining game:', error);
      if (error instanceof Error) {
        setError(`${t('Error joining game')}: ${error.message}`);
      } else {
        setError(t('Error joining game'));
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const router = useRouter();
  const onLeaveGame = async () => router.push(`/${language}/join`);
  const onStartGame = async () => {
    setIsGameStarted(true);
  };

  const hasGameData = gameData && gameData?.game_code?.length > 0;
  console.log('hasGameData', hasGameData);

  const primaryColor = 'var(--color-primaryText)';
  return (
    <Column className='gap-4 w-full h-full flex-1' justify='between'>
      {hasGameData ? (
        <div className='flex px-[10px] py-[6px] md:px-[14px] md:py-[10px] justify-center items-center self-stretch rounded-lg  bg-[#af9aec] gap-4 w-full max-w-small mx-auto  text-[16px] active:opacity-80'>
          <Row className='gap-2'>
            <GiSittingDog size={28} color='var(--color-primary)' />
            <Label style={{ color: 'white', marginBottom: -4 }}>
              {`${t('Waiting room for game')}: ${game_code}`}
            </Label>
          </Row>
        </div>
      ) : (
        <div className='flex px-[10px] py-[6px] md:px-[14px] md:py-[10px] justify-center items-center self-stretch rounded-lg  bg-[#FBF9E9] gap-4 w-full max-w-small mx-auto  text-[16px] active:opacity-80'>
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
        <Label>{t('Time till game starts')}:</Label>
        <Label style={{ color: primaryColor }}>{countdown}</Label>
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
      <Column className='gap-2 w-full p-4 bg-surface rounded-lg'>
        <Row className='gap-2'>
          <Label>{t('Game Title')}:</Label>
          <Label style={{ color: primaryColor }}>{game_name}</Label>
        </Row>
        <Row className='gap-2'>
          <Label>{t('Entry Fee')}:</Label>
          <Label style={{ color: primaryColor }}>
            {entry_fee ? entry_fee / LAMPORTS_PER_SOL : '-'} SOL
          </Label>
        </Row>
        <Row className='gap-2'>
          <Label>{t('Commission to game host')}:</Label>
          <Label style={{ color: primaryColor }}>
            {commission ? commission / 100 : '0 '}%
          </Label>
        </Row>
        <Row className='gap-2'>
          <Label>{t('Admin donation to the pool')}:</Label>
          <Label style={{ color: primaryColor }}>
            {donation_amount ? donation_amount / LAMPORTS_PER_SOL : '0 '}
            SOL
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
          <Label>{t('Total game time')}:</Label>
          <Label style={{ color: primaryColor }}>{totalTime}</Label>
        </Row>
        <Row className='gap-2'>
          <Label>{t('Split')}:</Label>
          <Label style={{ color: primaryColor }}>
            {even_split ? 'Evenly split among all winners' : 'Tiered'}
          </Label>
        </Row>
      </Column>
      {error && (
        <Alert
          variant='error'
          title={t('Error')}
          description={error}
          onClose={() => setError(null)}
        />
      )}
      {hasGameData ? (
        <Button secondary onClick={onLeaveGame}>
          {t('Leave game')}
        </Button>
      ) : (
        <Button onClick={onJoinGame} isLoading={isLoading}>
          {t('Join game')}
        </Button>
      )}
      {hasGameData && isAdmin && (
        <Button onClick={onStartGame}>{t('Start game')}</Button>
      )}
    </Column>
  );
};

export default JoinGameDetails;
