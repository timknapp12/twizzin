import { FaArrowLeft } from 'react-icons/fa6';
import { IconButton, Column, Row, PrimaryText } from '@/components';
import ClaimRewardCard from './ClaimRewardCard';

import RewardsBanner from './RewardsBanner';
import { useAppContext } from '@/contexts/AppContext';

interface RewardsViewProps {
  // eslint-disable-next-line no-unused-vars
  onSetView: (view: string) => void;
}

const RewardsView = ({ onSetView }: RewardsViewProps) => {
  const { t } = useAppContext();
  return (
    <Column className='gap-4 w-full' align='start'>
      <Row onClick={() => onSetView('home')} className='cursor-pointer'>
        <IconButton
          title='Back'
          Icon={FaArrowLeft}
          onClick={() => onSetView('home')}
          className='text-gray active:text-black/10'
        />
        <PrimaryText style={{ fontSize: 16 }}>{t('Back')}</PrimaryText>
      </Row>
      <Column className='w-full gap-4'>
        <RewardsBanner rewards={2} />
        <ClaimRewardCard />
        <ClaimRewardCard disabled />
      </Column>
    </Column>
  );
};

export default RewardsView;
