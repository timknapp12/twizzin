'use client';

import { useState } from 'react';
import {
  ScreenContainer,
  TwizzinLogo,
  GradientContainer,
  Column,
  H3,
  H3Brand,
} from '@/components';
import MoreInfo from './MoreInfo';
import { Landing } from './Landing';

export const HomeComponent = () => {
  const [showMoreInfo, setShowMoreInfo] = useState(false);

  const toggleMoreInfo = () => {
    setTimeout(() => {
      setShowMoreInfo((prev) => !prev);
    }, 200);
  };

  return (
    <ScreenContainer>
      <Column className='gap-4 w-full lg:w-1/2 mx-auto'>
        <GradientContainer>
          <Column>
            <H3Brand className='mr-2 ml-2 mt-2'>TWIZZIN</H3Brand>
            <H3>Take your friend's SOuL</H3>
          </Column>
          <TwizzinLogo />
          <H3>The web3 trivia game built on Solana</H3>
          <Landing />
        </GradientContainer>
        <MoreInfo isOpen={showMoreInfo} toggleMoreInfo={toggleMoreInfo} />
      </Column>
    </ScreenContainer>
  );
};
