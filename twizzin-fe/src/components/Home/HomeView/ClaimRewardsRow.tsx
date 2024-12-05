import { Row } from '@/components/containers';
import { RewardsCard, XPCard } from '@/components/RewardsCards';

const ClaimRewardsRow = ({
  onSetView,
}: {
  // eslint-disable-next-line no-unused-vars
  onSetView: (view: string) => void;
}) => {
  return (
    <Row className='gap-[10px] align-center w-full'>
      <XPCard progressPercentage={70} xp={5} onClick={() => onSetView('xp')} />
      <RewardsCard rewards={2} onClick={() => onSetView('rewards')} />
    </Row>
  );
};

export default ClaimRewardsRow;
