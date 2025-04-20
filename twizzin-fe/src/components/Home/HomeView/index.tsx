'use client';
import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { Button, Column, Row } from '@/components';
import { useAppContext } from '@/contexts';
import { CarouselItem } from '@/types';
import { GameState } from '@/utils/helpers/gameState';
import ConnectWalletForRewardsButton from './ConnectWalletForRewardsButton';
import ClaimRewardsRow from './ClaimRewardsRow';
import Carousel from './Carousel';
import art1 from '../../../assets/svgs/Online-Exams-Tests-1--Streamline-Manila.svg';
import art2 from '../../../assets/svgs/Esports-Tournament-Players-2--Streamline-Manila.svg';
import art3 from '../../../assets/svgs/Online-Learning-2--Streamline-Manila.svg';
import art4 from '../../../assets/svgs/Boasting--Streamline-Manila.svg';
import Dot from './Dot';
import { useGameContext } from '@/contexts';

const items: CarouselItem[] = [
  {
    title: 'Welcome to Twizzin',
    description: `Twizzin is an interactive Web3 game that embraces the 'Learn to Earn' model, making learning in Web3 fun and rewarding.`,
    image: art1.src,
    order: 0,
  },
  {
    title: 'Game Play',
    description: `Players compete to answer the same set of questions at the same time, with the winners taking the prize pool.`,
    image: art2.src,
    order: 1,
  },
  {
    title: `Expand your users' knowledge`,
    description: `Incentivize your users to better understand your product. Sponsor a game based on a new feature, whitepaper, or DAO vote.`,
    image: art3.src,
    order: 2,
  },
  {
    title: 'For the degens',
    description: `Create your own game. Challenge your friends to put some skin in the game and compete for the prize pool.`,
    image: art4.src,
    order: 3,
  },
];

interface HomeViewProps {
  // eslint-disable-next-line no-unused-vars
  onSetView: (view: string) => void;
}

const HomeView = ({ onSetView }: HomeViewProps) => {
  const { t, language } = useAppContext();
  const { connected } = useWallet();
  const router = useRouter();
  const { setGameStateWithMetadata } = useGameContext();

  const [selectedItem, setSelectedItem] = useState<number>(0);
  const [isCreateLoading, setIsCreateLoading] = useState(false);
  const [isJoinLoading, setIsJoinLoading] = useState(false);

  const onCreateGame = () => {
    setIsCreateLoading(true);
    router.push(`/${language}/create`);
  };
  const onJoinGame = () => {
    setIsJoinLoading(true);
    setGameStateWithMetadata(GameState.BROWSING);
    router.push(`/${language}/join`);
  };

  return (
    <Column className='gap-4 justify-between h-full flex flex-1'>
      <Column className='gap-4'>
        <div className='w-full'>
          {connected ? (
            <ClaimRewardsRow onSetView={onSetView} />
          ) : (
            <ConnectWalletForRewardsButton />
          )}
        </div>
        <Carousel
          items={items}
          setSelectedItem={setSelectedItem}
          selectedItem={selectedItem}
        />
        <Row className='gap-2'>
          {items.map((item, index) => (
            <Dot
              key={item.order}
              isSelected={index === selectedItem}
              onClick={() => setSelectedItem(index)}
            />
          ))}
        </Row>
      </Column>
      <Column className='gap-4 w-full'>
        <Button isLoading={isCreateLoading} secondary onClick={onCreateGame}>
          {t('Create a new game')}
        </Button>
        <Button isLoading={isJoinLoading} onClick={onJoinGame}>
          {t('Join a game')}
        </Button>
      </Column>
    </Column>
  );
};

export default HomeView;
