'use client';

import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from './Button';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { FaSignOutAlt } from 'react-icons/fa';
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
      return t('Connecting');
    }
    if (connected && publicKey) {
      if (isHovering) {
        return (
          <div className='flex items-center justify-center w-full'>
            <span>{t('Disconnect')}</span>
            <FaSignOutAlt className='ml-2' />
          </div>
        );
      }
      const address = publicKey.toBase58();
      const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;
      return t(`Connected: ${shortAddress}`);
    }
    return t('Connect Wallet');
  };

  return (
    <Button
      className={`${className} ${
        connected ? 'hover:bg-red-500 transition-colors duration-300' : ''
      }`}
      onClick={handleClick}
      isLoading={connecting}
      disabled={connecting}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {getButtonContent()}
    </Button>
  );
};
