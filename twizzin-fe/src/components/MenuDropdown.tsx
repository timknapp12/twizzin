'use client';

import React, { useEffect, useRef, useState } from 'react';
import { LanguageModal } from './modals';
import { useAppContext } from '@/contexts/AppContext';

interface MenuDropdownProps {
  anchorEl: React.RefObject<HTMLElement>;
  onClose: () => void;
}

export const MenuDropdown: React.FC<MenuDropdownProps> = ({
  anchorEl,
  onClose,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t } = useAppContext();
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        anchorEl.current &&
        !anchorEl.current.contains(event.target as Node)
      ) {
        // Check if the click is inside the LanguageModal
        const languageModal = document.querySelector('.language-modal');
        if (languageModal && languageModal.contains(event.target as Node)) {
          return; // Don't close if the click is inside the LanguageModal
        }
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [anchorEl, onClose]);

  useEffect(() => {
    if (anchorEl.current && dropdownRef.current) {
      const rect = anchorEl.current.getBoundingClientRect();
      dropdownRef.current.style.top = `${rect.bottom + window.scrollY}px`;
      dropdownRef.current.style.right = `${window.innerWidth - rect.right}px`;
    }
  }, [anchorEl]);

  const handleLanguageChange = () => {
    setIsLanguageModalOpen(false);
    onClose();
  };

  return (
    <>
      <div
        ref={dropdownRef}
        className='absolute bg-offWhite dark:bg-lightBlack shadow-lg rounded-md p-4 min-w-[200px]'
        style={{ position: 'absolute' }}
      >
        <ul>
          <li
            className='py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
            onClick={() => {
              setIsLanguageModalOpen(true);
            }}
          >
            {t('Change language')}
          </li>
          <li className='py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'>
            {t('Change currency')}
          </li>
        </ul>
      </div>
      {isLanguageModalOpen && (
        <LanguageModal
          isOpen={isLanguageModalOpen}
          onClose={() => setIsLanguageModalOpen(false)}
          onLanguageChange={handleLanguageChange}
          className='language-modal'
        />
      )}
    </>
  );
};
