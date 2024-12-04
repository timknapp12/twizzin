'use client';
import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button, Column, Row } from '@/components';
import { useAppContext } from '@/contexts/AppContext';
import { CarouselItem } from '@/types';
import ConnectWalletForRewardsButton from './ConnectWalletForRewardsButton';
import ClaimRewardsRow from './ClaimRewardsRow';
import Carousel from './Corousel';
import art1 from '../../../assets/illustration1.png';
import art2 from '../../../assets/illustration2.png';
import Dot from './Dot';

const items: CarouselItem[] = [
  {
    title: 'Discover Twizzin',
    description: `Twizzin is an interactive Web3 game that embraces the 'Learn to Earn' model, making learning in Web3 fun and rewarding.`,
    image: art1.src,
    order: 0,
  },
  {
    title: 'Item 2',
    description: 'Description 2',
    image: art2.src,
    order: 1,
  },
  {
    title: 'Item 3',
    description: 'Description 3',
    image: art1.src,
    order: 2,
  },
  {
    title: 'Item 4',
    description: 'Description 4',
    image: art2.src,
    order: 3,
  },
];

interface HomeViewProps {
  // eslint-disable-next-line no-unused-vars
  onSetView: (view: string) => void;
}

const HomeView = ({ onSetView }: HomeViewProps) => {
  const { t } = useAppContext();
  const { connected } = useWallet();

  const [selectedItem, setSelectedItem] = useState<number>(0);

  return (
    <Column className='gap-4'>
      <div className='max-w-small w-full'>
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
      <Button>{t('Create a new game')}</Button>
      <Button secondary>{t('Join a game')}</Button>
    </Column>
  );
};

export default HomeView;
