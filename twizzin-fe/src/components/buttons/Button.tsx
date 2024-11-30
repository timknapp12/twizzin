'use client';

import { ReactNode } from 'react';
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
        px-[14px] py-[10px]
        flex items-center justify-center
        gap-2.5
        self-stretch
        transition-all
        text-[16px]
        font-[600]
        rounded-lg
        ${
          secondary
            ? 'bg-transparent border-[1px] border-black/10 text-primaryText hover:border-disabledText active:border-secondaryText active:text-disabledText shadow-[0px_1px_2px_0px_rgba(9,8,23,0.05)]'
            : 'text-white bg-primary border-r-[1px] border-b-[3px] border-l-[1px] border-darkPurple shadow-[0px_1px_2px_0px_rgba(9,8,23,0.05)] hover:bg-lightPurple hover:border-mediumPurple active:bg-primary active:border-darkPurple'
        }
        ${
          isLoading || disabled
            ? 'opacity-70 cursor-not-allowed'
            : 'cursor-pointer'
        }
        ${className || ''}
      `}
    onClick={onClick}
    disabled={isLoading || disabled}
    {...props}
  >
    {isLoading ? (
      <FaSpinner className='animate-spin' size={28} />
    ) : (
      <>{children}</>
    )}
  </button>
);
