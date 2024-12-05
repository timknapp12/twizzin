'use client';
import { LanguageIconButton } from './buttons/LanguageIconButton';
import { WalletButton } from './buttons/WalletButton';
import sol from '../assets/svgs/sol.svg';
import ukFlag from '../assets/svgs/uk-flag.svg';
import twizzin from '../assets/svgs/twizzin.svg';
import twizzinLogo from '../assets/images/twizzin-logo.png';
import Image from 'next/image';

export const Header: React.FC = () => {
  return (
    <header className='bg-background w-full flex justify-between items-center relative z-50'>
      <div className='flex items-center gap-2'>
        <Image src={twizzinLogo} alt='Twizzin Logo' className='h-8 w-auto' />
        <Image
          src={twizzin}
          alt='Twizzin text'
          className='hidden md:block h-6 w-auto'
        />
      </div>
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
