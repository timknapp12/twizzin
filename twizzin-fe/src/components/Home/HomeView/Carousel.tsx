import Image from 'next/image';
import { CarouselItem } from '@/types';
import { PrimaryText, SecondaryText, IconButton, Row } from '@/components';
import { FaCircleChevronRight, FaCircleChevronLeft } from 'react-icons/fa6';
import { Column } from '@/components/containers';
import { useAppContext } from '@/contexts';

const Carousel = ({
  items,
  setSelectedItem,
  selectedItem,
}: {
  items: CarouselItem[];
  // eslint-disable-next-line no-unused-vars
  setSelectedItem: (item: number) => void;
  selectedItem: number;
}) => {
  const { t } = useAppContext();
  const { title, description, image } = items[selectedItem];

  const handlePrevious = () => {
    // Loop back to the last item if at the beginning
    setSelectedItem(selectedItem === 0 ? items.length - 1 : selectedItem - 1);
  };

  const handleNext = () => {
    // Loop to the first item if at the end
    setSelectedItem(selectedItem === items.length - 1 ? 0 : selectedItem + 1);
  };

  return (
    <Row className='grid grid-cols-[auto_1fr_auto] gap-4 items-center w-full'>
      <IconButton
        size={30}
        title='Previous'
        Icon={FaCircleChevronLeft}
        onClick={handlePrevious}
        className='text-gray active:text-black/10'
      />
      <Column className='gap-2 items-center'>
        <div className='md:min-h-[200px]'>
          <Image
            src={image}
            alt={title}
            width={200}
            height={100}
            style={{ width: 'auto' }}
            priority
          />
        </div>
        <PrimaryText className='text-center'>{t(title)}</PrimaryText>
        <div className='min-h-[50px] text-center'>
          <SecondaryText>{t(description)}</SecondaryText>
        </div>
      </Column>
      <IconButton
        size={30}
        title='Next'
        Icon={FaCircleChevronRight}
        onClick={handleNext}
        className='text-gray active:text-black/10'
      />
    </Row>
  );
};

export default Carousel;
