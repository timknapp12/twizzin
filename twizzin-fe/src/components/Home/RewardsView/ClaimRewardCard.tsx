import Image from 'next/image';
import { ClaimButton } from '@/components/buttons';
import { Column, Row } from '@/components/containers';
import { PrimaryText, SecondaryText } from '@/components/texts';
import { GameReward } from '@/types';

const imgDim = 48;

const ClaimRewardCard = ({ reward }: { reward: GameReward }) => {
  console.log('reward', reward);
  return (
    <div className='w-full border border-disabledText rounded-lg flex justify-between items-center p-[10px]'>
      <Row className='gap-2'>
        <Image
          src={reward.imageUrl || ''}
          alt='jup'
          width={imgDim}
          height={imgDim}
          className='rounded-full'
        />
        <Column align='start'>
          <SecondaryText>{reward.gameName}</SecondaryText>
          <PrimaryText>
            {reward.rewardAmount / 10 ** reward.decimals} {reward.tokenSymbol}
          </PrimaryText>
        </Column>
      </Row>
      <ClaimButton disabled={reward.claimed} />
    </div>
  );
};

export default ClaimRewardCard;
