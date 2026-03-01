'use client';

import AddUpdateGame from './AddUpdateGame';
import { Header } from '../Header';
import { ScreenContainer, InnerScreenContainer } from '../containers';
import { FullAuthGuard } from '../AuthGuard';
import { useAppContext } from '@/contexts/AppContext';

export const CreateComponent = () => {
  const { t } = useAppContext();
  
  return (
    <ScreenContainer>
      <Header />
      <InnerScreenContainer className='mt-4'>
        <FullAuthGuard fallbackMessage={t('Connect your wallet and verify to create games')}>
          <AddUpdateGame />
        </FullAuthGuard>
      </InnerScreenContainer>
    </ScreenContainer>
  );
};
