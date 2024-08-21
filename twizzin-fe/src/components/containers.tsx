import React, { ReactNode } from 'react';

interface ScreenContainerProps {
  children: ReactNode;
  className?: string;
}

export const ScreenContainer = ({ children }: ScreenContainerProps) => (
  <main className='flex min-h-screen flex-col items-center justify-start pl-6 sm:pl-8 pr-10 sm:pr-16 p-10 sm:p-16'>
    <BorderedContainer>{children}</BorderedContainer>
  </main>
);

export const BorderedContainer = ({
  children,
  className,
}: ScreenContainerProps & { className?: string }) => (
  <div
    className={`flex-grow w-full p-4 rounded-tl-2xl rounded-br-2xl bg-gradient-to-br from-lightPurple to-darkPurple flex ${
      className || ''
    }`}
  >
    <div className='relative w-full'>
      <div className='absolute -top-12 -right-12 w-[calc(100%+24px)] h-[calc(100%+24px)] border border-dark-background dark:border-light-background rounded-tl-2xl rounded-br-2xl pointer-events-none'></div>
      <div className='bg-light-background dark:bg-dark-background w-full h-full rounded-tl-2xl rounded-br-2xl pt-6 pr-6 pb-12 pl-14 flex flex-col'>
        <Column>{children}</Column>
      </div>
    </div>
  </div>
);

const justifyClassMap = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
} as const;

const alignClassMap = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
  'space-between': 'items-space-between',
} as const;

type JustifyType = keyof typeof justifyClassMap;
type AlignType = keyof typeof alignClassMap;

interface ColumnProps extends React.HTMLAttributes<HTMLDivElement> {
  justify?: JustifyType;
  align?: AlignType;
  children: ReactNode;
}

export const Column = ({
  justify = 'center',
  align = 'center',
  children,
  className,
  ...props
}: ColumnProps) => (
  <div
    className={`flex flex-col ${justifyClassMap[justify]} ${
      alignClassMap[align]
    } ${className || ''}`}
    {...props}
  >
    {children}
  </div>
);

interface RowProps extends React.HTMLAttributes<HTMLDivElement> {
  justify?: JustifyType;
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  children: ReactNode;
}

export const Row = ({
  justify = 'center',
  align = 'center',
  children,
  className,
  ...props
}: RowProps) => (
  <div
    className={`flex flex-row flex-wrap items-${align} ${
      justifyClassMap[justify]
    } ${className || ''}`}
    {...props}
  >
    {children}
  </div>
);

export const GradientContainer = ({
  children,
  className,
}: ScreenContainerProps) => (
  <div
    className={`w-full p-4 rounded-tl-2xl rounded-br-2xl bg-gradient-to-br from-lightPurple to-darkPurple ${
      className || ''
    }`}
  >
    <Column>{children}</Column>
  </div>
);
