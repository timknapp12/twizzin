'use client';
import { useState } from 'react';
import { Button, Column, Row } from '@/components';
import ConnectWalletForRewardsButton from './ConnectWalletForRewardsButton';
import { useAppContext } from '@/contexts/AppContext';
import { CarouselItem } from '@/types';
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

const HomeTile = () => {
  const { t } = useAppContext();

  const [selectedItem, setSelectedItem] = useState<number>(0);

  return (
    <Column className='gap-4 w-full lg:w-1/2 mx-auto max-w-[520px] mb-2'>
      <ConnectWalletForRewardsButton />
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

export default HomeTile;
