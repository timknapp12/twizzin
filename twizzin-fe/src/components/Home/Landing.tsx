import { FaXTwitter, FaTelegram } from 'react-icons/fa6';
import { Column, Row } from '../containers';
import { H3 } from '../texts';
import { useTranslation } from 'react-i18next';

export const Landing = () => {
  const { t } = useTranslation();
  return (
    <Column className='gap-4'>
      <Row className='text-center'>
        <Column className='items-center mt-6'>
          <H3>
            {t(
              'Twizzin is currently in development. Follow us on X and Telegram to stay updated on our progress.'
            )}
          </H3>
        </Column>
      </Row>
      <Row className='gap-8'>
        <a
          href='https://x.com/twizzinapp'
          target='_blank'
          rel='noopener noreferrer'
        >
          <FaXTwitter size={48} style={{ cursor: 'pointer' }} />
        </a>
        <a
          href='https://t.me/+Xp_4og3g-dIwNWZh'
          target='_blank'
          rel='noopener noreferrer'
        >
          <FaTelegram size={48} style={{ cursor: 'pointer' }} />
        </a>
      </Row>
    </Column>
  );
};
