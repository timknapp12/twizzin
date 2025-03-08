import { Row } from '@/components/containers';
import { RewardsCard, XPCard } from '@/components/RewardsCards';
import { useAppContext } from '@/contexts';

const ClaimRewardsRow = ({
  onSetView,
}: {
  // eslint-disable-next-line no-unused-vars
  onSetView: (view: string) => void;
}) => {
  const { userXP, userRewards, level, progress } = useAppContext();
  const rewards = userRewards.length || 0;

  const progressPercentage = progress ? Number(progress * 100) : 0;
  return (
    <Row className='gap-[10px] align-center w-full'>
      <XPCard
        progressPercentage={progressPercentage}
        xp={userXP}
        onClick={() => onSetView('xp')}
        level={level}
      />
      <RewardsCard rewards={rewards} onClick={() => onSetView('rewards')} />
    </Row>
  );
};

export default ClaimRewardsRow;
