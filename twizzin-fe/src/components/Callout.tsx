'use client';

import React, { useRef, useState, useEffect } from 'react';
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
  const [style, setStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLDivElement>(null);
  const calloutRef = useRef<HTMLDivElement>(null);

  useClickOutside([triggerRef, calloutRef], () => setIsOpen(false));

  // calculate position to handle smaller screens
  useEffect(() => {
    if (isOpen && calloutRef.current && triggerRef.current) {
      const calloutRect = calloutRef.current.getBoundingClientRect();
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newStyle: React.CSSProperties = {};

      // Calculate positions
      if (position === 'left' || position === 'right') {
        // Vertical positioning
        let top =
          triggerRect.top + (triggerRect.height - calloutRect.height) / 2;
        top = Math.max(
          10,
          Math.min(top, viewportHeight - calloutRect.height - 10)
        );

        // Horizontal positioning
        if (position === 'left') {
          const left = Math.max(10, triggerRect.left - calloutRect.width - 8);
          newStyle = { top: `${top}px`, left: `${left}px` };
        } else {
          const left = Math.min(
            viewportWidth - calloutRect.width - 10,
            triggerRect.right + 8
          );
          newStyle = { top: `${top}px`, left: `${left}px` };
        }
      } else {
        // Horizontal positioning for top/bottom
        let left =
          triggerRect.left + (triggerRect.width - calloutRect.width) / 2;
        left = Math.max(
          10,
          Math.min(left, viewportWidth - calloutRect.width - 10)
        );

        // Vertical positioning
        if (position === 'top') {
          const top = Math.max(10, triggerRect.top - calloutRect.height - 8);
          newStyle = { top: `${top}px`, left: `${left}px` };
        } else {
          const top = Math.min(
            viewportHeight - calloutRect.height - 10,
            triggerRect.bottom + 8
          );
          newStyle = { top: `${top}px`, left: `${left}px` };
        }
      }

      setStyle(newStyle);
    }
  }, [isOpen, position]);

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
          style={style}
          className={`
            fixed z-50 
            bg-background
            rounded-lg shadow-lg 
            p-2
            max-h-32 overflow-y-auto
            w-[300px] min-w-[250px]
            border border-disabledText
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
