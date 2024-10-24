'use client';

import React, { useState } from 'react';
import { FiMenu } from 'react-icons/fi';
import { MenuDropdown } from './MenuDropdown';

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = React.useRef<HTMLButtonElement>(null);

  const handleMenuClick = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className='w-full flex justify-between items-center p-4 sm:px-8 relative z-50'>
      <div />
      <button
        ref={menuButtonRef}
        onClick={handleMenuClick}
        className='p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors'
        aria-label='Open menu'
      >
        <FiMenu size={24} />
      </button>
      {isMenuOpen && (
        <MenuDropdown
          anchorEl={menuButtonRef}
          onClose={() => setIsMenuOpen(false)}
        />
      )}
    </header>
  );
};
