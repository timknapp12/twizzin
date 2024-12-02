'use client';

import { ScreenContainer, Footer, Header } from '@/components';
import HomeTile from './HomeTile';

export const HomeComponent = () => {
  return (
    <ScreenContainer>
      <Header />
      <div
        className='flex-grow flex flex-col justify-center items-center'
        style={{ marginTop: '-7vh' }}
      >
        <HomeTile />
      </div>
      <Footer />
    </ScreenContainer>
  );
};
