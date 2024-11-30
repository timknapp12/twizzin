'use client';
import { LanguageIconButton } from './buttons/LanguageIconButton';
import { WalletButton } from './buttons/WalletButton';
import sol from '../assets/sol.png';
import uk from '../assets/uk.png';

export const Header: React.FC = () => {
  return (
    <header className='bg-background w-full flex justify-between items-center p-4 sm:px-8 relative z-50'>
      <div>Twizzin</div>
      <div className='flex items-center gap-2'>
        <LanguageIconButton imageSrc={sol.src} alt='Solana' disabled />
        <LanguageIconButton imageSrc={uk.src} alt='English' disabled />
        <WalletButton />
      </div>
    </header>
  );
};
