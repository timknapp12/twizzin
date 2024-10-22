'use client';

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
import { useAppContext } from '@/contexts/AppContext';

export const HomeComponent = () => {
  const { t } = useAppContext();

  return (
    <ScreenContainer>
      <Column className='gap-4 w-full lg:w-1/2 mx-auto'>
        <GradientContainer>
          <H3Brand>TWIZZIN</H3Brand>
          <TwizzinLogo />
          <H3>Proof of Learn</H3>
          <H3>{t('The Web3 trivia game built on Solana')}</H3>
          <Landing />
        </GradientContainer>
        <MoreInfo />
      </Column>
    </ScreenContainer>
  );
};
