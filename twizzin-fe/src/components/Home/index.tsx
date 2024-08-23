'use client';

import { useState } from 'react';
import {
  ScreenContainer,
  H1,
  H1Brand,
  TwizzinLogo,
  GradientContainer,
  Row,
  Button,
  Column,
} from '@/components';
import { FaChevronDown } from 'react-icons/fa';
import MoreInfo from './MoreInfo';
import { Landing } from './Landing';

export const HomeComponent = () => {
  const [showMoreInfo, setShowMoreInfo] = useState(false);

  const toggleMoreInfo = () => setShowMoreInfo((prev) => !prev);

  return (
    <ScreenContainer>
      <Column className='gap-4 w-full lg:w-1/2 mx-auto'>
        <GradientContainer>
          <TwizzinLogo />
          {/* <Row>
            <H1 className='font-mono'>You be</H1>
            <H1Brand className='mr-2 ml-2 mt-2'>TWIZZIN</H1Brand>
            <H1 className='font-mono'>in:</H1>
          </Row> */}
          <Landing />
        </GradientContainer>
        {showMoreInfo ? (
          // TODO make this a smooth transition
          <MoreInfo toggleMoreInfo={toggleMoreInfo} />
        ) : (
          <Button onClick={toggleMoreInfo}>
            <Row className='w-full relative'>
              <span className='flex-grow mr-6 ml-6'>Gimme more info</span>
              <FaChevronDown
                size={18}
                className='absolute top-2 right-0 hidden sm:block'
              />
            </Row>
          </Button>
        )}
      </Column>
    </ScreenContainer>
  );
};
