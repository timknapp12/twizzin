'use client';
import React, { useState } from 'react';
import {
  FaCircleInfo,
  FaTriangleExclamation,
  FaCircleCheck,
  FaCircleXmark,
  FaFaceDizzy,
} from 'react-icons/fa6';
import { Column, Row } from './containers';

export interface AlertProps {
  variant: 'info' | 'warning' | 'success' | 'error';
  title?: string;
  description: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant,
  title,
  description,
  onClose,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);

  const variantClasses = {
    info: 'bg-blue/10 border-blue text-blue',
    warning: 'bg-yellow/10 border-yellow text-yellow',
    success: 'bg-green/10 border-green text-green',
    error: 'bg-red/10 border-red text-red',
  };

  const variantIcons = {
    info: FaCircleInfo,
    warning: FaTriangleExclamation,
    success: FaCircleCheck,
    error: FaFaceDizzy,
  };

  const Icon = variantIcons[variant];

  // animation for closing the alert
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      setShouldRender(false);
      onClose?.();
    }, 300);
  };

  if (!shouldRender) return null;

  return (
    <Column
      className={`w-full border-l-8 p-2 mb-2 ${
        variantClasses[variant]
      } ${className}
        transition-all duration-300 ease-in-out
        ${
          isVisible ? 'opacity-100' : 'opacity-0 transform translate-y-[-10px]'
        }`}
      role='alert'
      align='space-between'
    >
      <div className='flex flex-col'>
        <Row justify='between' className='gap-1'>
          <Row justify='start' className='gap-1'>
            <Icon className='h-4 w-4' />
            {title && <p className='font-semibold'>{title}</p>}
          </Row>
          {onClose && (
            <Row justify='end'>
              <FaCircleXmark
                className='h-4 w-4 cursor-pointer'
                onClick={handleClose}
              />
            </Row>
          )}
        </Row>

        <div className='flex-grow mt-1'>
          <div className='text-sm'>{description}</div>
        </div>
      </div>
    </Column>
  );
};
