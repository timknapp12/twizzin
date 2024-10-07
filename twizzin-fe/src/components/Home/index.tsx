'use client';

import { useTranslation } from 'react-i18next';
import { useRouter, useParams } from 'next/navigation';
import {
  ScreenContainer,
  TwizzinLogo,
  GradientContainer,
  Column,
  H3,
  H3Brand,
  Button,
} from '@/components';
import MoreInfo from './MoreInfo';
import { Landing } from './Landing';

export const HomeComponent = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const lang = params.lang as string;

  return (
    <ScreenContainer>
      <div className='mb-4 flex justify-center lg:justify-end items-center w-full'>
        <Button
          style={{ width: '200px' }}
          onClick={() => router.push(`/${lang}/create`)}
        >
          {t('Create game')}
        </Button>
      </div>
      <Column className='gap-4 w-full lg:w-1/2 mx-auto'>
        <GradientContainer>
          <Column>
            <H3Brand className='mr-2 ml-2 mt-2'>TWIZZIN</H3Brand>
          </Column>
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
