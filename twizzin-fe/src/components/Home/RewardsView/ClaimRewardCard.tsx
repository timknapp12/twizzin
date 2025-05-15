import { useState } from 'react';
import Image from 'next/image';
import { ClaimButton } from '@/components/buttons';
import { Column, Row } from '@/components/containers';
import { PrimaryText, SecondaryText } from '@/components/texts';
import { GameReward } from '@/types';
import { claimCombined, getCurrentConfig } from '@/utils';
import { useProgram, useAppContext } from '@/contexts';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { toast } from 'react-toastify';

const imgDim = 48;
const { network } = getCurrentConfig();

const ClaimRewardCard = ({ reward }: { reward: GameReward }) => {
  const { t, fetchUserXPAndRewards } = useAppContext();
  const { program } = useProgram();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  console.log('reward', reward);

  const [loading, setLoading] = useState(false);

  const handleClaim = async () => {
    setLoading(true);
    if (!program || !connection || !publicKey || !sendTransaction) {
      toast.error(t('Connect your wallet to claim rewards'));
      return setLoading(false);
    }
    try {
      const result = await claimCombined({
        program,
        connection,
        playerPubkey: publicKey,
        sendTransaction,
        adminPubkey: new PublicKey(reward.adminWallet),
        gameCode: reward.gameCode,
        mint: new PublicKey(reward.tokenMint),
        isNative: reward.isNative,
        gameId: reward.gameId,
      });
      if (result.signature) {
        toast.success(
          <div>
            {t('Reward claimed successfully!')}
            <a
              href={`https://explorer.solana.com/tx/${result.signature}?cluster=${network}`}
              target='_blank'
              rel='noopener noreferrer'
              className='text-secondary hover:text-primary ml-2'
            >
              {t('View transaction')}
            </a>
          </div>,
          {
            autoClose: false,
          }
        );
        setTimeout(async () => {
          await fetchUserXPAndRewards();
        }, 1000);
      } else {
        toast.error(t('Claim failed'));
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('An error occurred while claiming reward');
      }
    } finally {
      setLoading(false);
    }
  };

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
      <ClaimButton
        disabled={reward.claimed}
        onClick={handleClaim}
        loading={loading}
      />
    </div>
  );
};

export default ClaimRewardCard;
