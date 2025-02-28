import { Row } from '@/components/containers';
import { RewardsCard, XPCard } from '@/components/RewardsCards';
import { useAppContext } from '@/contexts';

const ClaimRewardsRow = ({
  onSetView,
}: {
  // eslint-disable-next-line no-unused-vars
  onSetView: (view: string) => void;
}) => {
  const { userXP, userRewards } = useAppContext();
  const rewards = userRewards.length || 0;
  return (
    <Row className='gap-[10px] align-center w-full'>
      <XPCard
        progressPercentage={70}
        xp={userXP}
        // onClick={() => onSetView('xp')}
        onClick={() => alert('Your XP is ' + userXP)}
        level={5}
      />
      <RewardsCard rewards={rewards} onClick={() => onSetView('rewards')} />
    </Row>
  );
};

export default ClaimRewardsRow;
