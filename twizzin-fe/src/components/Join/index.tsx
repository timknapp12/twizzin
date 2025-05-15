'use client';

import { ScreenContainer, Column, InnerScreenContainer } from '@/components';
import { Header } from '../Header';
import JoinForm from './JoinForm';

export const JoinComponent = () => {
  return (
    <ScreenContainer>
      <Header />
      <InnerScreenContainer>
        <Column className='gap-4 w-full flex-1 mt-6' justify='start'>
          <JoinForm />
        </Column>
      </InnerScreenContainer>
    </ScreenContainer>
  );
};

// LXBUZQ
