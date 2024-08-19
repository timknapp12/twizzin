import React, { ReactNode } from 'react';

interface ScreenContainerProps {
  children: ReactNode;
}

export const ScreenContainer = ({ children }: ScreenContainerProps) => (
  <main className='flex min-h-screen flex-col items-center justify-start p-8'>
    {children}
  </main>
);
