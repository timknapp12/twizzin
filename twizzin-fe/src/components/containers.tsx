import React, { ReactNode } from 'react';

interface ScreenContainerProps {
  children: ReactNode;
  className?: string;
}

export const ScreenContainer = ({ children }: ScreenContainerProps) => (
  <main className='flex min-h-screen flex-col items-center justify-start p-6 sm:pl-8 sm:pr-16 sm:p-16'>
    <BorderedContainer>{children}</BorderedContainer>
  </main>
);

// This container is used to wrap the content of the screen with 2 borders, which is hidden on mobile
export const BorderedContainer = ({
  children,
  className,
}: ScreenContainerProps & { className?: string }) => (
  <div
    className={`flex-grow w-full sm:p-4 rounded-tl-2xl rounded-br-2xl bg-gradient-to-br from-lightPurple to-darkPurple flex ${
      className || ''
    }`}
  >
    <div className='relative w-full'>
      <div className='absolute sm:-top-12 sm:-right-12 sm:w-[calc(100%+24px)] sm:h-[calc(100%+24px)] sm:border border-dark-background dark:border-light-background rounded-tl-2xl rounded-br-2xl pointer-events-none'></div>
      <div className='bg-light-background dark:bg-dark-background w-full h-full rounded-tl-2xl rounded-br-2xl p-6 sm:pt-6 sm:pr-6 sm:pb-12 sm:pl-14 flex flex-col'>
        <Column>{children}</Column>
      </div>
    </div>
  </div>
);

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

export const GradientContainer = ({
  children,
  className,
}: ScreenContainerProps) => (
  <div
    className={`w-full p-4 rounded-tl-2xl rounded-br-2xl bg-gradient-to-br from-lightPurple to-darkPurple text-white ${
      className || ''
    }`}
  >
    <Column>{children}</Column>
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
