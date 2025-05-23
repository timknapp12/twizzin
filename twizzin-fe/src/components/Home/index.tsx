'use client';

import { useState } from 'react';
import {
  ScreenContainer,
  InnerScreenContainer,
  Footer,
  Header,
} from '@/components';
import HomeView from './HomeView';
import RewardsView from './RewardsView';
import XpView from './XpView';
export const HomeComponent = () => {
  const [view, setView] = useState<'home' | 'rewards' | 'xp'>('home');

  const onSetView = (view: string) =>
    setView(view as 'home' | 'rewards' | 'xp');

  return (
    <ScreenContainer>
      <Header />
      <InnerScreenContainer>
        <div
          className='flex-grow flex flex-col items-center w-full'
          style={{ marginTop: '7vh' }}
        >
          {view === 'home' && <HomeView onSetView={onSetView} />}
          {view === 'rewards' && <RewardsView onSetView={onSetView} />}
          {view === 'xp' && <XpView onSetView={onSetView} />}
        </div>
      </InnerScreenContainer>
      <Footer />
    </ScreenContainer>
  );
};
