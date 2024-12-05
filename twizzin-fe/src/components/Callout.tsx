'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { useClickOutside } from '@/hooks/useClickOutside';
import { IoInformationCircleOutline } from 'react-icons/io5';
import { SecondaryText } from './texts';
import blackElephant from '../assets/svgs/elephant-black-no-bg.svg';

interface CalloutProps {
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  iconClassName?: string;
}

export const Callout: React.FC<CalloutProps> = ({
  content,
  position = 'top',
  className = '',
  iconClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const calloutRef = useRef<HTMLDivElement>(null);

  useClickOutside([triggerRef, calloutRef], () => setIsOpen(false));

  const positionStyles: { [key: string]: string } = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className='relative inline-block'>
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ${iconClassName}`}
      >
        <IoInformationCircleOutline className='w-5 h-5' />
      </div>

      {isOpen && (
        <div
          ref={calloutRef}
          className={`
            absolute z-50 
            bg-background
            rounded-lg shadow-lg 
            p-2
            max-h-32 overflow-y-auto
            w-[300px] min-w-[250px]
            border border-disabledText
            ${positionStyles[position]}
            ${className}
          `}
        >
          <div className='flex items-center gap-2'>
            <Image
              src={blackElephant}
              alt='elephant'
              className='w-[20px] h-[20px]'
            />
            <SecondaryText style={{ fontSize: '12px' }}>
              {content}
            </SecondaryText>
          </div>
        </div>
      )}
    </div>
  );
};
