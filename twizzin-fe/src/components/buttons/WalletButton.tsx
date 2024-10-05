'use client';

import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from './Button';
import { useTranslation } from 'react-i18next';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { FaSignOutAlt } from 'react-icons/fa';

interface WalletButtonProps {
  className?: string;
}

export const WalletButton: React.FC<WalletButtonProps> = ({ className }) => {
  const { connecting, connected, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const { t } = useTranslation();
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
      return t('Connected: {{shortAddress}}', {
        shortAddress: `${address.slice(0, 4)}...${address.slice(-4)}`,
      });
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
