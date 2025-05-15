import { Row } from './containers';
import { SecondaryText, DisabledText } from './texts';
import { FaXTwitter, FaTelegram } from 'react-icons/fa6';
import Link from 'next/link';
import { useAppContext } from '@/contexts';

const iconSize = 18;

export const Footer = () => {
  const { t } = useAppContext();

  return (
    <footer className='footer text-secondaryText flex flex-col gap-2 p-2'>
      <Row className='gap-2'>
        <a
          href='https://x.com/twizzinapp'
          target='_blank'
          rel='noopener noreferrer'
        >
          <FaXTwitter size={iconSize} style={{ cursor: 'pointer' }} />
        </a>
        <a
          href='https://t.me/+Xp_4og3g-dIwNWZh'
          target='_blank'
          rel='noopener noreferrer'
        >
          <FaTelegram size={iconSize} style={{ cursor: 'pointer' }} />
        </a>
      </Row>
      <Row className='gap-1'>
        <DisabledText>© {t('2024 Twizzin. All rights reserved.')}</DisabledText>
        <Link
          href='/privacy-policy'
          className='underline decoration-secondaryText flex items-center'
        >
          <SecondaryText>{t('Privacy Policy')}</SecondaryText>
        </Link>
        {' | '}
        <Link
          href='/cookie-policy'
          className='underline decoration-secondaryText flex items-center'
        >
          <SecondaryText>{t('Cookie Policy')} </SecondaryText>
        </Link>
      </Row>
    </footer>
  );
};
