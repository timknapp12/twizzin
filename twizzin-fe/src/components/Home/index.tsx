'use client';

import { useState } from 'react';
import {
  ScreenContainer,
  TwizzinLogo,
  GradientContainer,
  Column,
  Row,
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
          <Row>
            <H3Brand className='mr-2 ml-2 mt-2'>TWIZZIN:</H3Brand>
            <H3>a game for trivia wizzes</H3>
          </Row>
          <TwizzinLogo />
          <Landing />
        </GradientContainer>
        <MoreInfo isOpen={showMoreInfo} toggleMoreInfo={toggleMoreInfo} />
      </Column>
    </ScreenContainer>
  );
};
