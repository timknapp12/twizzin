'use client';

import { ScreenContainer, Column, InnerScreenContainer } from '@/components';
import { Header } from '../Header';
import { useJoinGameContext } from '@/contexts';
import JoinForm from './JoinForm';
import JoinGameDetails from './JoinGameDetails';

export const JoinComponent = () => {
  const { partialGameData } = useJoinGameContext();

  return (
    <ScreenContainer>
      <Header />
      <InnerScreenContainer>
        <Column className='gap-4 w-full flex-1 mt-6' justify='start'>
          {!partialGameData ? <JoinForm /> : <JoinGameDetails />}
        </Column>
      </InnerScreenContainer>
    </ScreenContainer>
  );
};

// LXBUZQ
