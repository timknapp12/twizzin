import React from 'react';

interface TextProps {
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
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

export const H6 = ({ children, className, ...props }: TextProps) => (
  <span className={`text-xs sm:text-sm md:text-base ${className}`} {...props}>
    {children}
  </span>
);

export const Label = ({ children, className, ...props }: TextProps) => (
  <label
    className={`block mb-1 text-sm font-medium text-secondaryText ${className}`}
    {...props}
  >
    {children}
  </label>
);

export const PrimaryText = ({ children, className, ...props }: TextProps) => (
  <span
    className={`text-primaryText text-[16px] md:text-[20px] font-semibold ${className}`}
    {...props}
  >
    {children}
  </span>
);

export const SecondaryText = ({ children, className, ...props }: TextProps) => (
  <span
    className={`text-secondaryText font-[500] text-[12px] md:text-[14px]  ${className}`}
    {...props}
  >
    {children}
  </span>
);

export const DisabledText = ({ children, className, ...props }: TextProps) => (
  <span
    className={`text-disabledText font-[500] text-xs  ${className}`}
    {...props}
  >
    {children}
  </span>
);
