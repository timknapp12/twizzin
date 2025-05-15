'use client';

import AddUpdateGame from './AddUpdateGame';
import { Header } from '../Header';
import { ScreenContainer, InnerScreenContainer } from '../containers';

export const CreateComponent = () => (
  <ScreenContainer>
    <Header />
    <InnerScreenContainer className='mt-4'>
      <AddUpdateGame />
    </InnerScreenContainer>
  </ScreenContainer>
);
