'use client';

import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { FaSignOutAlt, FaWallet, FaSpinner } from 'react-icons/fa';
import { useAppContext } from '@/contexts/AppContext';
import { useScreenSize } from '@/hooks/useScreenSize';

interface WalletButtonProps {
  className?: string;
}

export const WalletButton: React.FC<WalletButtonProps> = ({ className }) => {
  const { connecting, connected, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const { t } = useAppContext();
  const [isHovering, setIsHovering] = useState(false);
  const screenSize = useScreenSize();

  const shouldShowIcons = screenSize === 'large' || screenSize === 'medium';

  const handleClick = () => {
    if (connected) {
      disconnect();
    } else {
      setVisible(true);
    }
  };

  const getButtonContent = () => {
    if (connecting) {
      return (
        <div className='flex items-center justify-center w-full gap-2'>
          {shouldShowIcons && <FaSpinner className='animate-spin' />}
          <span>{t('Connecting')}</span>
        </div>
      );
    }
    if (connected && publicKey) {
      if (isHovering) {
        return (
          <div className='flex items-center justify-center w-full gap-2'>
            <span>{t('Disconnect')}</span>
            {shouldShowIcons && <FaSignOutAlt />}
          </div>
        );
      }
      const address = publicKey.toBase58();
      const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;
      return (
        <div className='flex items-center justify-center w-full gap-2'>
          <span>{shortAddress}</span>
          {shouldShowIcons && <FaSignOutAlt />}
        </div>
      );
    }
    return (
      <div className='flex items-center justify-center w-full gap-2'>
        {shouldShowIcons && <FaWallet />}
        <span>{t('Connect Wallet')}</span>
      </div>
    );
  };

  return (
    <button
      className={`${className} ${
        connected
          ? 'bg-background text-primaryText border border-primaryText hover:bg-primaryText hover:text-background active:text-gray'
          : 'bg-primaryText text-background hover:bg-background hover:text-primaryText  active:text-black/60'
      } px-4 py-2 rounded-full shadow-sm border border-black/[0.06] transition-colors duration-200 md:min-w-[172px] text-[12px] md:text-[14px] ${
        connecting ? 'opacity-70 cursor-not-allowed' : ''
      }`}
      onClick={handleClick}
      disabled={connecting}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {getButtonContent()}
    </button>
  );
};
