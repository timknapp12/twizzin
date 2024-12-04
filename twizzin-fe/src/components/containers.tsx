'use client';

import React, { ReactNode } from 'react';

interface ScreenContainerProps {
  children: ReactNode;
  className?: string;
}

export const ScreenContainer = ({ children }: ScreenContainerProps) => {
  return (
    <main className='bg-background flex min-h-screen flex-col items-center'>
      <div className='flex flex-col justify-between w-full h-full min-h-screen p-4'>
        {children}
      </div>
    </main>
  );
};

// use tailwind props to set the justify and align of Column and Row Components
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

// Grid
interface GridProps {
  gapSize?: string;
  min?: string;
  children: React.ReactNode;
  className?: string;
}

export const Grid: React.FC<GridProps> = ({
  gapSize = '1rem',
  min = '200px',
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={`grid ${className || ''}`}
      style={{
        gap: gapSize,
        gridTemplateColumns: `repeat(auto-fit, minmax(${min}, 1fr))`,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export const Gap = ({ size = '1rem' }: { size?: string }) => (
  <div style={{ height: size }} />
);

// this has the max width for centering content in the middle of the screen
export const InnerScreenContainer = ({ children }: { children: ReactNode }) => (
  <Column className='gap-4 w-full lg:w-1/2 mx-auto max-w-med mb-2 flex-grow flex flex-col justify-start items-center'>
    {children}
  </Column>
);
