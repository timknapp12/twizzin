import { Row } from '@/components/containers';
import { RewardsCard, XPCard } from '@/components/RewardsCards';

const ClaimRewardsRow = () => {
  return (
    <Row className='gap-[10px] align-center'>
      <XPCard progressPercentage={70} xp={5} />
      <RewardsCard rewards={2} />
    </Row>
  );
};

export default ClaimRewardsRow;
