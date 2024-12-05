import Image from 'next/image';
import { ClaimButton } from '@/components/buttons';
import jup from '../../../assets/images/jup.png';
import { Column, Row } from '@/components/containers';
import { PrimaryText, SecondaryText } from '@/components/texts';

const imgDim = 40;

const ClaimRewardCard = ({ disabled = false }: { disabled?: boolean }) => {
  return (
    <div className='w-full border border-disabledText rounded-lg flex justify-between items-center p-[10px]'>
      <Row className='gap-2'>
        <Image src={jup} alt='jup' width={imgDim} height={imgDim} />
        <Column align='start'>
          <SecondaryText>Game title</SecondaryText>
          <PrimaryText>15 $JUP</PrimaryText>
        </Column>
      </Row>
      <ClaimButton disabled={disabled} />
    </div>
  );
};

export default ClaimRewardCard;
