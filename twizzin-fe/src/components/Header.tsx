'use client';
import Image from 'next/image';
import Link from 'next/link';
import { LanguageIconButton } from './buttons/LanguageIconButton';
import { WalletButton } from './buttons/WalletButton';
import sol from '../assets/svgs/sol.svg';
import ukFlag from '../assets/svgs/uk-flag.svg';
import twizzin from '../assets/svgs/twizzin.svg';
import twizzinIcon from '../assets/svgs/twizzin-icon.svg';
import { FaCircleInfo } from 'react-icons/fa6';
import { useAppContext } from '@/contexts';

export const Header: React.FC = () => {
  const { language, setIsBetaModalOpen } = useAppContext();

  return (
    <div className='w-full flex flex-col'>
      <header className='bg-background w-full flex justify-between items-center relative'>
        <Link href={`/${language}`}>
          <div className='flex items-center gap-2'>
            <Image
              src={twizzinIcon}
              alt='Twizzin Icon'
              className='h-9 w-auto mt-1'
              priority
            />
            <Image
              src={twizzin}
              alt='Twizzin text'
              className='hidden md:block h-6 w-auto'
              priority
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
      <div
        className='bg-primary w-full flex justify-center items-center p-2 mt-2 gap-2 cursor-pointer'
        onClick={() => setIsBetaModalOpen(true)}
      >
        <div className='text-white text-sm'>Beta on Solana devnet</div>
        <FaCircleInfo className='text-white' />
      </div>
    </div>
  );
};
