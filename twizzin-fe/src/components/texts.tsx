import React from 'react';
import { atma } from '@/app/fonts';

interface TextProps {
  children: React.ReactNode;
  className?: string;
  [key: string]: any; // To allow additional props
}

export const H1 = ({ children, className, ...props }: TextProps) => (
  <span className={`text-2xl sm:text-3xl md:text-4xl ${className}`} {...props}>
    {children}
  </span>
);

export const H1Brand = ({ children, className, ...props }: TextProps) => (
  <span
    className={`text-2xl sm:text-3xl md:text-5xl ${atma.className} ${className}`}
    {...props}
  >
    {children}
  </span>
);

export const ButtonText = ({ children, className, ...props }: TextProps) => (
  <span className={`text-lg sm:text-xl md:text-3xl ${className}`} {...props}>
    {children}
  </span>
);
