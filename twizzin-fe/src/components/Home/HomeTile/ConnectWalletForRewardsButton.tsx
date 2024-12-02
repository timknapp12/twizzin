'use client';
import { PiShootingStarFill } from 'react-icons/pi';
import { FaChevronRight } from 'react-icons/fa6';

import { Row } from '@/components';
import { useAppContext } from '@/contexts/AppContext';

const ConnectWalletforrewardsButton = () => {
  const { t } = useAppContext();
  return (
    <button className='flex px-[10px] py-[6px] md:px-[14px] md:py-[10px] justify-between items-center self-stretch rounded-full bg-[#FBF9E9] gap-4 w-full max-w-[370px] mx-auto text-[#655B30] text-[10px] md:text-[14px]'>
      <Row className='gap-2'>
        <PiShootingStarFill size={20} color='#ECC51E' />
        {t('Connect your wallet to claim rewards')}
      </Row>
      <FaChevronRight />
    </button>
  );
};

export default ConnectWalletforrewardsButton;
