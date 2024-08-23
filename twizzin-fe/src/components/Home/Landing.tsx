import { FaXTwitter } from 'react-icons/fa6';
import { Column, Row } from '../containers';
import { H3, H3Brand } from '../texts';

export const Landing = () => {
  return (
    <Column className='gap-4'>
      <Row className='text-center'>
        <Column className='items-center'>
          <H3>This sick game called</H3>
          <H3Brand className='mt-2 mb-2'>TWIZZIN</H3Brand>
          <H3>
            is currently in development. Follow us on X to stay updated on our
            progress.
          </H3>
        </Column>
      </Row>
      <a
        href='https://x.com/Tim52455313'
        target='_blank'
        rel='noopener noreferrer'
      >
        <FaXTwitter size={48} style={{ cursor: 'pointer' }} />
      </a>
    </Column>
  );
};
