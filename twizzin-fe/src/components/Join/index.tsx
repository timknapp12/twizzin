'use client';

import React, { useState, FormEvent } from 'react';
import {
  ScreenContainer,
  TwizzinLogo,
  Button,
  Column,
  Input,
  H3,
} from '@/components';
import { useAppContext } from '@/contexts/AppContext';

export const JoinComponent = () => {
  const { t, gameCode, setGameCode } = useAppContext();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const onHandleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGameCode(e.target.value);
    setError('');
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
      // Simulate an API call with a delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log('gameCode', gameCode);
      // Add your async operation here, e.g.:
      // await joinGame(gameCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <form className='w-full' onSubmit={handleSubmit}>
        <Column className='gap-4 w-full lg:w-1/2 mx-auto'>
          <div>
            <Column className='gap-2'>
              <H3>TWIZZIN</H3>
              <TwizzinLogo />
              <H3 className='text-center'>
                {t('Enter a game code provided by your host')}
              </H3>
              <Input
                placeholder={`<${t('Game Code')}>`}
                value={gameCode}
                onChange={onHandleChange}
                required
                maxLength={6}
                minLength={6}
                disabled={isLoading}
              />
            </Column>
          </div>
          <Button type='submit' isLoading={isLoading}>
            {t('Join')}
          </Button>
          {error && <p className='text-red'>{error}</p>}
        </Column>
      </form>
    </ScreenContainer>
  );
};
