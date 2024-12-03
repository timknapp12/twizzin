'use client';

import { useState } from 'react';
import { ScreenContainer, Footer, Header } from '@/components';
import HomeView from './HomeView';
import RewardsView from './RewardsView';

export const HomeComponent = () => {
  const [view, setView] = useState<'home' | 'rewards' | 'xp'>('home');

  const onSetView = (view: string) =>
    setView(view as 'home' | 'rewards' | 'xp');

  return (
    <ScreenContainer>
      <Header />
      <div
        className='flex-grow flex flex-col justify-center items-center'
        style={{ marginTop: '-7vh' }}
      >
        {view === 'home' && <HomeView onSetView={onSetView} />}
        {view === 'rewards' && <RewardsView onSetView={onSetView} />}
      </div>
      <Footer />
    </ScreenContainer>
  );
};
