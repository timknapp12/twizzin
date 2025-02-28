'use client';
import Image from 'next/image';
import Link from 'next/link';
import { LanguageIconButton } from './buttons/LanguageIconButton';
import { WalletButton } from './buttons/WalletButton';
import sol from '../assets/svgs/sol.svg';
import ukFlag from '../assets/svgs/uk-flag.svg';
import twizzin from '../assets/svgs/twizzin.svg';
import twizzinIcon from '../assets/svgs/twizzin-icon.svg';
import { useAppContext } from '@/contexts';

export const Header: React.FC = () => {
  const { language } = useAppContext();
  return (
    <header className='bg-background w-full flex justify-between items-center relative z-50'>
      <Link href={`/${language}`}>
        <div className='flex items-center gap-2'>
          <Image
            src={twizzinIcon}
            alt='Twizzin Icon'
            className='h-9 w-auto mt-1'
          />
          <Image
            src={twizzin}
            alt='Twizzin text'
            className='hidden md:block h-6 w-auto'
          />
        </div>
      </Link>
      <div className='flex items-center gap-1 md:gap-2'>
        <LanguageIconButton
          imageSrc={sol.src}
          alt='Solana'
          disabled
          className='scale-90 md:scale-100'
        />
        <LanguageIconButton
          imageSrc={ukFlag}
          alt='English'
          disabled
          className='scale-90 md:scale-100'
        />
        <WalletButton />
      </div>
    </header>
  );
};
