import React from 'react';
import { Column, H5, Row, H5Brand } from '@/components';
import { useAppContext } from '@/contexts/AppContext';

const MoreInfo = () => {
  const { t } = useAppContext();
  return (
    <div>
      <Column align='start' className='w-full'>
        <Row>
          <H5Brand className='mr-2'>TWIZZIN</H5Brand>
          <p>{` [twi' z' in] ${t('verb, informal')}`}</p>
        </Row>
        <p>
          {`1. ${t(
            'To be in a state of heightened mental acuity and knowledge recall, particularly while answering trivia questions.'
          )}`}
          <br />
          {`2. ${t(
            'To perform exceptionally well in a quiz or trivia competition, as if possessing expert-level knowledge or magical, wizzard-like abilities.'
          )}`}
        </p>
        <br />
        <br />
        <H5>Proof of Learn</H5>
        <p>
          {`${t(
            `Twizzin is an interactive Web3 game that embraces the 'Learn to Earn' model, making learning in Web3 fun and rewarding.`
          )} `}
          {`${t(
            'Players compete to answer the same set of questions at the same time, with the winners taking the prize pot.'
          )} `}
          {`${t(
            `Twizzin helps projects incentivize their users to truly understand their products.`
          )} `}
        </p>
        <br />
        <H5>{t(`But that's not all`)}</H5>
        <p>
          {`${t(
            `Twizzin also hosts live trivia games for anyone and everyone, allowing players to put their money where their mouth is by competing in real-time with others around the world.`
          )} `}
          {`${t(
            `These global games will attract a new user base to Web3 and Solana.`
          )} `}
          {t(
            'People love trivia and people love wagering. Twizzin uses both to create an exciting and engaging way to educate and entertain.'
          )}
        </p>
        <br />
        <H5>{t(`But why?`)}</H5>
        <p>
          {`${t(
            `We believe in creating a better world and having fun along the way. Crypto adoption has surged, but there is still much work to be done.`
          )} `}
          {`${t(
            `By offering a fun, incentivized trivia game, we aim to onboard more users and give them a positive first experience with crypto, especially on Solana—the people's chain.`
          )} `}
          {t(
            `By leveraging Twizzin, we can help new users navigate the risks of the crypto space—like scams, rug pulls, and drained wallets—while introducing them to the impressive products that Solana’s elite builders are shipping.`
          )}
          <br />
          <br />
          {`${t(`Crypto needs a better way to teach users.`)} `}
          {t(`Crypto needs Twizzin.`)}
        </p>
      </Column>
    </div>
  );
};

export default MoreInfo;
