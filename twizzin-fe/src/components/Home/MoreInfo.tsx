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
            Twizzin is an interactive Web3 trivia game built on the Solana
            blockchain, where players compete against each other in real time.
            To join a game, players must pay an entry fee in SOL tokens, which
            contributes to the prize pool. Each round, everyone answers the same
            set of multiple-choice questions, earning points based on speed and
            accuracy. The top performers on the leaderboard are rewarded with a
            share of the prize pool.
          </p>
        </div>
      </Column>
    </Button>
  );
};

export default MoreInfo;
