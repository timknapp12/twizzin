'use client';

import { ReactNode } from 'react';
import { ButtonText } from './texts';

interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Button = ({
  children,
  className,
  onClick,
  ...props
}: ButtonProps) => (
  <button
    className={`
        w-full
        px-4 py-2
        rounded-tl-lg rounded-br-lg
        bg-gradient-to-br from-lightPurple to-darkPurple
        text-dark-background dark:text-light-background
        text-xl sm:text-2xl
        hover:opacity-80 transition-opacity
        cursor-pointer
        ${className || ''}
      `}
    onClick={onClick}
    {...props}
  >
    <ButtonText>{children}</ButtonText>
  </button>
);
