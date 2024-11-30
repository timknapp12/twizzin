'use client';

import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { FaSignOutAlt, FaWallet, FaSpinner } from 'react-icons/fa';
import { useAppContext } from '@/contexts/AppContext';

interface WalletButtonProps {
  className?: string;
}

export const WalletButton: React.FC<WalletButtonProps> = ({ className }) => {
  const { connecting, connected, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const { t } = useAppContext();
  const [isHovering, setIsHovering] = useState(false);

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
          <FaSpinner className='animate-spin' />
          <span>{t('Connecting')}</span>
        </div>
      );
    }
    if (connected && publicKey) {
      if (isHovering) {
        return (
          <div className='flex items-center justify-center w-full gap-2'>
            <span>{t('Disconnect')}</span>
            <FaSignOutAlt />
          </div>
        );
      }
      const address = publicKey.toBase58();
      const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;
      return (
        <div className='flex items-center justify-center w-full gap-2'>
          <span>{shortAddress}</span>
          <FaSignOutAlt />
        </div>
      );
    }
    return (
      <div className='flex items-center justify-center w-full gap-2'>
        <FaWallet />
        <span>{t('Connect Wallet')}</span>
      </div>
    );
  };

  return (
    <button
      className={`${className} ${
        connected
          ? 'bg-background text-foreground border border-foreground hover:bg-foreground hover:text-background'
          : 'bg-foreground text-background hover:bg-background hover:text-foreground'
      } px-4 py-2 rounded-full shadow-sm border border-black/[0.06] transition-colors duration-200 min-w-[172px] ${
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
