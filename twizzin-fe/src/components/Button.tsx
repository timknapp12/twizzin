'use client';

import { ReactNode } from 'react';
import { ButtonText } from './texts';
import { FaSpinner } from 'react-icons/fa6';

interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  secondary?: boolean;
}

export const Button = ({
  children,
  className,
  onClick,
  isLoading = false,
  disabled = false,
  secondary = false,
  ...props
}: ButtonProps) => (
  <button
    className={`
        w-full
        px-4 py-2
        rounded-tl-2xl rounded-br-2xl
        rounded-tr-2xl rounded-bl-2xl
        text-xl sm:text-2xl
        transition-all
        flex items-center justify-center
        ${
          secondary
            ? 'bg-transparent border-2 border-lightPurple text-lightPurple'
            : 'bg-gradient-to-br from-lightPurple to-darkPurple text-dark-background dark:text-light-background'
        }
        ${
          isLoading || disabled
            ? 'opacity-70 cursor-not-allowed'
            : 'cursor-pointer hover:opacity-90'
        }
        ${className || ''}
      `}
    onClick={onClick}
    disabled={isLoading || disabled}
    {...props}
  >
    {isLoading ? (
      <FaSpinner className='animate-spin' size={32} />
    ) : (
      <ButtonText>{children}</ButtonText>
    )}
  </button>
);
