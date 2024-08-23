import { Button, Row, Column } from '@/components';
import { FaChevronUp } from 'react-icons/fa';

const MoreInfo = ({ toggleMoreInfo }: { toggleMoreInfo: () => void }) => (
  <Button onClick={toggleMoreInfo} className='w-full'>
    <Column className='items-start gap-2'>
      <Row className='w-full relative'>
        <span className='flex-grow mr-6 ml-6'>Gimme less info</span>
        <FaChevronUp
          size={18}
          className='absolute top-2 right-0 hidden sm:block'
        />
      </Row>
      <p className='text-sm text-left'>
        Are you a triva wizz? Then Twizzin is the game for you. Compete with
        other players at the same time answering the same set of multiple choice
        questions. Follow these simple steps to play:
        <br />
        <br />
        Step 1: Within 10 minutes of start time, connect your Solana wallet.
        <br />
        Step 2: Enter a username for the game session and pay the 0.1 SOL entry
        fee.
        <br />
        Step 3: At the start time, answer the questions as fast and accurately
        as you can.
        <br />
        Step 4: When you are done, click submit.
        <br />
        Step 4: See how you stacked up against the other twizzers.
        <br />
        Winners are selected based on accuracy and speed. The winners will split
        what's in the pool, minus a 3% fee for the creators.
      </p>
    </Column>
  </Button>
);

export default MoreInfo;
