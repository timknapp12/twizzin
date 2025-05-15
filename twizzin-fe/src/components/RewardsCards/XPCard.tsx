import { useEffect, useState } from 'react';
import { Column } from '@/components/containers';
import { PrimaryText } from '@/components/texts';
import { PiShootingStarFill } from 'react-icons/pi';
import RewardsCardsContainer from './RewardsCardsContainer';
import { useAppContext } from '@/contexts';

interface XPCardProps {
  progressPercentage?: number;
  xp?: number;
  onClick?: () => void;
  level?: number;
}

export const XPCard = ({
  progressPercentage = 70,
  onClick,
  level = 0,
}: XPCardProps) => {
  const { t } = useAppContext();
  const [progress, setProgress] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(0);
  const size = 50;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  useEffect(() => {
    setProgress(0);
    setCurrentLevel(0);

    setTimeout(() => {
      setProgress(progressPercentage);

      const duration = 1000;
      const steps = 60;
      const stepDuration = duration / steps;
      const increment = level / steps;

      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= level) {
          setCurrentLevel(level);
          clearInterval(timer);
        } else {
          setCurrentLevel(current);
        }
      }, stepDuration);

      return () => clearInterval(timer);
    }, 100);
  }, [progressPercentage, level]);

  return (
    <RewardsCardsContainer onClick={onClick}>
      <Column align='start'>
        <PiShootingStarFill size={20} color='var(--color-tertiary)' />
        <PrimaryText style={{ fontSize: 16 }}>{t('Your XP')}</PrimaryText>
      </Column>
      <div className='relative'>
        <svg
          className='absolute top-0 left-0 -rotate-90'
          width={size}
          height={size}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill='none'
            stroke='transparent'
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill='none'
            stroke='var(--color-tertiary)'
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className='transition-all duration-1000 ease-in-out'
          />
        </svg>
        <div className='flex justify-center items-center bg-[#EFEFEF] w-[50px] h-[50px] rounded-full'>
          <Column align='center'>
            <PrimaryText style={{ fontSize: 12, lineHeight: 'normal' }}>
              lvl
            </PrimaryText>
            <PrimaryText style={{ fontSize: 20, lineHeight: 1 }}>
              {Math.round(currentLevel)}
            </PrimaryText>
          </Column>
        </div>
      </div>
    </RewardsCardsContainer>
  );
};
