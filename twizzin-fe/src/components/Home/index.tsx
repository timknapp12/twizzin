'use client';

import { useState } from 'react';
import {
  ScreenContainer,
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
                size={16}
                className='absolute top-2 right-0 hidden sm:block'
              />
            </Row>
          </Button>
        )}
      </Column>
    </ScreenContainer>
  );
};
