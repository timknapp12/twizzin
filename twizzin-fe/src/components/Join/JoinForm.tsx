import React, { useState, FormEvent } from 'react';
import Image from 'next/image';
import { Button, Column, Input, Row, Callout } from '@/components';
import { FaGamepad } from 'react-icons/fa';
import { useAppContext, useGameContext } from '@/contexts';
import searchImg from '../../assets/svgs/Searching--Streamline-Manila.svg';
import { toast } from 'react-toastify';

const JoinForm = () => {
  const { t } = useAppContext();
  const { gameCode, setGameCode, getGameByCode } = useGameContext();

  const [isLoading, setIsLoading] = useState(false);

  const onHandleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGameCode(e.target.value);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit();
  };

  const onSubmit = async () => {
    setIsLoading(true);
    try {
      if (gameCode.length !== 6) {
        throw new Error(t('Game code must be 6 characters'));
      }
      await getGameByCode(gameCode.toUpperCase());
    } catch (err: any) {
      console.log('err', err?.message);
      if (err?.message?.includes('multiple (or no) rows returned')) {
        toast.error(t('Game code not found'));
      } else {
        toast.error(err?.message || 'An error occurred');
      }
      setIsLoading(false);
    }
  };

  return (
    <Column className='gap-4 w-full h-full flex-1' justify='between'>
      <div className='flex px-[10px] py-[6px] md:px-[14px] md:py-[10px] items-center justify-center self-stretch rounded-full bg-[#FBF9E9] gap-4 w-full max-w-small mx-auto text-[#655B30] text-[14px] active:opacity-80'>
        <Row className='gap-2'>
          <FaGamepad size={28} color='var(--color-tertiary)' />
          {t('Join a game')}
        </Row>
      </div>
      <Image
        src={searchImg}
        alt='searchImg'
        width={300}
        height={300}
        priority
      />
      <form className='w-full' onSubmit={handleSubmit}>
        <Column className='gap-4 w-full'>
          <Column className='gap-2 w-full'>
            <Input
              label={t('Game code')}
              value={gameCode}
              onChange={onHandleChange}
              required
              maxLength={6}
              minLength={6}
              disabled={isLoading}
              callout={
                <Callout
                  content={t(
                    'Your game host should provide you with a 6-digit game code to join the game. Only join games from hosts you trust!'
                  )}
                  position='left'
                />
              }
            />
          </Column>
          <Button type='submit' isLoading={isLoading}>
            {t('Find game')}
          </Button>
        </Column>
      </form>
    </Column>
  );
};

export default JoinForm;
