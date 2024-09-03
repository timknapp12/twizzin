import React from 'react';
import { Button, Row, Column } from '@/components';
import { FaChevronUp, FaChevronDown } from 'react-icons/fa';

const MoreInfo = ({
  isOpen,
  toggleMoreInfo,
}: {
  isOpen: boolean;
  toggleMoreInfo: () => void;
}) => {
  return (
    <Button
      onClick={toggleMoreInfo}
      className='w-full transition-all duration-700 ease-in-out p-4'
    >
      <Column className='w-full'>
        <Row className='w-full relative'>
          <span className='flex-grow'>
            {isOpen ? 'Gimme less info' : 'Gimme more info'}
          </span>
          {isOpen ? (
            <FaChevronUp size={18} className='hidden sm:block' />
          ) : (
            <FaChevronDown size={18} className='hidden sm:block' />
          )}
        </Row>
        <div
          className='overflow-hidden transition-[max-height] duration-700 ease-in-out'
          style={{ maxHeight: isOpen ? '1000px' : '0px' }}
        >
          <p className='text-sm text-left'>
            twizzin [twi' z' in] verb, informal
            <br />
            1. To be in a state of heightened mental acuity and knowledge
            recall, particularly while answering trivia questions.
            <br />
            2. To perform exceptionally well in a quiz or trivia competition, as
            if possessing expert-level knowledge or magical, wizzard-like
            abilities.
            <br />
            <br />
            Compete with other players at the same time, answering the same set
            of multiple choice questions. Follow these simple steps to play:
            <br />
            <br />
            Step 1: Within 10 minutes of start time, connect your Solana wallet.
            <br />
            Step 2: Enter a username for the game session and pay the 0.1 SOL
            entry fee.
            <br />
            Step 3: At the start time, answer the questions as fast and
            accurately as you can.
            <br />
            Step 4: When you are done, click submit.
            <br />
            Step 4: See how you stacked up against the other twizzers.
            <br />
            Winners are selected based on accuracy and speed. The winners will
            split what's in the pool, minus a small fee for the creators.
          </p>
        </div>
      </Column>
    </Button>
  );
};

export default MoreInfo;
