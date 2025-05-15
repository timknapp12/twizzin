'use client';
import React from 'react';
import { IconType } from 'react-icons';

interface IconButtonProps {
  Icon: IconType;
  onClick: () => void;
  title: string;
  className?: string;
  size?: number;
  disabled?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  Icon,
  onClick,
  title,
  className = '',
  size = 20,
  disabled = false,
}) => {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`
        p-2 rounded-full transition-all duration-150 ease-in-out ${className}
        ${disabled ? 'opacity-20 cursor-not-allowed' : ''}
      `}
    >
      <Icon size={size} />
    </button>
  );
};
