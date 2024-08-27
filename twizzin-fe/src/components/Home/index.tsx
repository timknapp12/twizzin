'use client';

import { useState } from 'react';
import {
  ScreenContainer,
  TwizzinLogo,
  GradientContainer,
  Column,
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
          <TwizzinLogo />
          {/* <Row>
            <H1>You be</H1>
            <H1Brand className='mr-2 ml-2 mt-2'>TWIZZIN</H1Brand>
            <H1>in:</H1>
          </Row> */}
          <Landing />
        </GradientContainer>
        <MoreInfo isOpen={showMoreInfo} toggleMoreInfo={toggleMoreInfo} />
      </Column>
    </ScreenContainer>
  );
};
