import React from 'react';

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

export const H2 = ({ children, className, ...props }: TextProps) => (
  <span className={`text-xl sm:text-2xl md:text-3xl ${className}`} {...props}>
    {children}
  </span>
);

export const H3 = ({ children, className, ...props }: TextProps) => (
  <span className={`text-lg sm:text-xl md:text-2xl ${className}`} {...props}>
    {children}
  </span>
);

export const H3Secondary = ({ children, className, ...props }: TextProps) => (
  <span
    className={`text-lg sm:text-xl md:text-2xl opacity-70 ${className}`}
    {...props}
  >
    {children}
  </span>
);

export const H5 = ({ children, className, ...props }: TextProps) => (
  <span className={`text-sm sm:text-base md:text-lg ${className}`} {...props}>
    {children}
  </span>
);

export const Label = ({ children, className, ...props }: TextProps) => (
  <label
    className={`block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300 ${className}`}
    {...props}
  >
    {children}
  </label>
);

export const LabelSecondary = ({
  children,
  className,
  ...props
}: TextProps) => (
  <label
    className={`block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300 opacity-70 ${className}`}
    {...props}
  >
    {children}
  </label>
);

export const PrimaryText = ({ children, className, ...props }: TextProps) => (
  <span
    className={`text-primaryText text-[16px] md:text-[20px] font-['Open_Runde',sans-serif] font-semibold leading-normal ${className}`}
    {...props}
  >
    {children}
  </span>
);

export const SecondaryText = ({ children, className, ...props }: TextProps) => (
  <span
    className={`text-secondaryText text-center font-[500] text-[12px] md:text-[14px] font-['Open_Runde',sans-serif] ${className}`}
    {...props}
  >
    {children}
  </span>
);

export const DisabledText = ({ children, className, ...props }: TextProps) => (
  <span
    className={`text-disabledText text-center font-[500] text-xs font-['Open_Runde',sans-serif] ${className}`}
    {...props}
  >
    {children}
  </span>
);
