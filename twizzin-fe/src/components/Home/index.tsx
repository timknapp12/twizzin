'use client';

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

export const HomeComponent = () => {
  return (
    <ScreenContainer>
      <Column className='gap-4'>
        <GradientContainer>
          <TwizzinLogo />
          <Row>
            <H1 className='font-mono'>You be</H1>
            <H1Brand className='mr-2 ml-2 mt-2'>TWIZZIN</H1Brand>
            <H1 className='font-mono'>in:</H1>
          </Row>
        </GradientContainer>
        <Button onClick={() => console.log('clicked')}>
          <Row justify='between'>
            <div />
            Gimme more info
            <FaChevronDown size={18} />
          </Row>
        </Button>
      </Column>
    </ScreenContainer>
  );
};
