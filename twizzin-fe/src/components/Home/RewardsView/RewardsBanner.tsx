import { Column, PrimaryText } from '@/components';
import { LuPartyPopper } from 'react-icons/lu';
import { useAppContext } from '@/contexts/AppContext';

const RewardsBanner = ({ rewards = 2 }: { rewards: number }) => {
  const { t } = useAppContext();
  return (
    <div className='flex h-[70px] w-full p-[14px] justify-between items-center rounded-[14px] bg-surface hover:bg-[#F5F5F7]'>
      <Column align='start'>
        <LuPartyPopper size={20} color='var(--color-primary)' />
        <PrimaryText style={{ fontSize: 16 }}>{t('Rewards')}</PrimaryText>
      </Column>
      <div className='flex justify-center items-center bg-[#6E3FFC0F] w-[50px] h-[50px] rounded-full'>
        <Column>
          <PrimaryText
            style={{
              fontSize: 22,
              lineHeight: 1,
              color: 'var(--color-primary)',
            }}
          >
            {rewards}
          </PrimaryText>
        </Column>
      </div>
    </div>
  );
};

export default RewardsBanner;
