import React from 'react';
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
}

export const Alert: React.FC<AlertProps> = ({
  variant,
  title,
  description,
  onClose,
}) => {
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

  return (
    <Column
      className={`w-full border-l-4 p-4 mb-4 ${variantClasses[variant]}`}
      role='alert'
      align='space-between'
    >
      <div className='flex flex-col'>
        {onClose && (
          <Row justify='end'>
            <FaCircleXmark
              className='h-5 w-5 cursor-pointer'
              onClick={onClose}
            />
          </Row>
        )}
        <Row justify='start' className='gap-2'>
          <Icon className='h-5 w-5' />
          {title && <p className='font-semibold'>{title}</p>}
        </Row>

        <div className='flex-grow mt-2'>
          <div className='text-sm'>{description}</div>
        </div>
      </div>
    </Column>
  );
};
