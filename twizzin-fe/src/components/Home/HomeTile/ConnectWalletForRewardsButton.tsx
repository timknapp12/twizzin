'use client';
import { PiShootingStarFill } from 'react-icons/pi';
import { FaChevronRight } from 'react-icons/fa6';

import { Row } from '@/components';
import { useAppContext } from '@/contexts/AppContext';

const ConnectWalletforrewardsButton = () => {
  const { t } = useAppContext();
  return (
    <button className='flex px-[14px] py-[10px] justify-between items-center self-stretch rounded-full bg-[#FBF9E9] gap-4 w-full mx-auto text-[#655B30] text-[14px]'>
      <div />
      <Row className='gap-2'>
        <PiShootingStarFill size={20} color='#ECC51E' />
        {t('Connect your wallet to claim rewards')}
      </Row>
      <FaChevronRight />
    </button>
  );
};

export default ConnectWalletforrewardsButton;