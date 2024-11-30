'use client';

import { ScreenContainer, Footer, Header, Gap } from '@/components';
import { useAppContext } from '@/contexts/AppContext';
import HomeTile from './HomeTile';

export const HomeComponent = () => {
  const { t } = useAppContext();

  return (
    <ScreenContainer>
      <Header />
      <div className='flex-grow'>
        <Gap size='2.5rem' />
        <HomeTile />
      </div>
      <Footer />
    </ScreenContainer>
  );
};
