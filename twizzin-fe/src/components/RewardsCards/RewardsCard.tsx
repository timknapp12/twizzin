import { useEffect, useState } from 'react';
import { Column } from '@/components/containers';
import { PrimaryText } from '@/components/texts';
import { LuPartyPopper } from 'react-icons/lu';
import RewardsCardsContainer from './Container';
import { useAppContext } from '@/contexts/AppContext';

export const RewardsCard = ({ rewards = 5 }: { rewards: number }) => {
  const { t } = useAppContext();
  const [currentRewards, setCurrentRewards] = useState(0);

  useEffect(() => {
    // Reset and animate the rewards number
    setCurrentRewards(0);

    setTimeout(() => {
      const duration = 1000;
      const steps = 60; // 60 steps for smooth animation
      const stepDuration = duration / steps;
      const increment = rewards / steps;

      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= rewards) {
          setCurrentRewards(rewards);
          clearInterval(timer);
        } else {
          setCurrentRewards(current);
        }
      }, stepDuration);

      return () => clearInterval(timer);
    }, 100);
  }, [rewards]);

  return (
    <RewardsCardsContainer>
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
            {Math.round(currentRewards)}
          </PrimaryText>
        </Column>
      </div>
    </RewardsCardsContainer>
  );
};
