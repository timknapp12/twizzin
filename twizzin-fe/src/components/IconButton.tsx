'use client';
import React, { useState } from 'react';
import { IconType } from 'react-icons';

interface IconButtonProps {
  Icon: IconType;
  onClick: () => void;
  title: string;
  className?: string;
  size?: number;
  disabled?: boolean;
}

const IconButton: React.FC<IconButtonProps> = ({
  Icon,
  onClick,
  title,
  className = '',
  size = 20,
  disabled = false,
}) => {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      title={title}
      disabled={disabled}
      className={`
        p-2 rounded-full transition-all duration-150 ease-in-out ${className}
        hover:bg-gray-200 dark:hover:bg-gray-700 
        ${isPressed ? 'opacity-60' : ''}
        ${disabled ? 'opacity-20 cursor-not-allowed' : ''}
      `}
    >
      <Icon size={size} />
    </button>
  );
};

export default IconButton;
