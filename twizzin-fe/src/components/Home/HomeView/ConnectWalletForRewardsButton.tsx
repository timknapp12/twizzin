'use client';
import { PiShootingStarFill } from 'react-icons/pi';
import { FaChevronRight } from 'react-icons/fa6';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

import { Row } from '@/components';
import { useAppContext } from '@/contexts/AppContext';

const ConnectWalletForRewardsButton = () => {
  const { setVisible } = useWalletModal();
  const { t } = useAppContext();

  const handleClick = () => setVisible(true);

  return (
    <button
      onClick={handleClick}
      className='flex px-[10px] py-[6px] md:px-[14px] md:py-[10px] justify-between items-center self-stretch rounded-full bg-[#FBF9E9] gap-4 w-full max-w-small mx-auto text-[#655B30] text-[10px] md:text-[14px] active:opacity-80'
    >
      <Row className='gap-2'>
        <PiShootingStarFill size={20} color='var(--color-tertiary)' />
        {t('Connect your wallet to claim rewards')}
      </Row>
      <FaChevronRight />
    </button>
  );
};

export default ConnectWalletForRewardsButton;
