import React, { ReactNode } from 'react';

interface ScreenContainerProps {
  children: ReactNode;
  className?: string;
}

export const ScreenContainer = ({ children }: ScreenContainerProps) => (
  <main className='flex min-h-screen flex-col items-center justify-start p-16'>
    <BorderedContainer>{children}</BorderedContainer>
  </main>
);

export const BorderedContainer = ({
  children,
}: ScreenContainerProps & { className?: string }) => (
  <div className='flex-grow w-full p-4 rounded-tl-lg rounded-br-lg bg-gradient-to-r from-lightPurple to-darkPurple flex'>
    <div className='relative w-full'>
      <div className='absolute -top-12 -right-12 w-[calc(100%+24px)] h-[calc(100%+24px)] border border-white rounded-tl-lg rounded-br-lg'></div>
      <div className='bg-light-background dark:bg-dark-background w-full h-full rounded-tl-lg rounded-br-lg pt-6 pr-6 pb-12 pl-16 flex flex-col'>
        <Column>{children}</Column>
      </div>
    </div>
  </div>
);

interface ColumnProps {
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  children: ReactNode;
}

export const Column = ({
  justify = 'center',
  align = 'center',
  children,
}: ColumnProps) => (
  <div className={`flex flex-col justify-${justify} items-${align}`}>
    {children}
  </div>
);
