'use client';

import { useModal } from '@getpara/react-sdk';
import dynamic from 'next/dynamic';
import { useAppContext } from '@/contexts';

const ParaModalComponent = dynamic(
  () => import('@getpara/react-sdk').then((mod) => mod.ParaModal),
  { ssr: false }
);

export function ParaButton() {
  const { t } = useAppContext();
  const { openModal } = useModal();

  return (
    <>
      <button
        onClick={() => openModal()}
        className='bg-primaryText text-background hover:bg-background hover:text-primaryText active:text-black/60 px-4 py-2 rounded-full shadow-md border border-black/[0.06] transition-colors duration-200 md:min-w-[120px] text-[12px] md:text-[14px]'
      >
        {t('Sign In')}
      </button>

      <ParaModalComponent
        appName='Twizzin'
        logo='https://dygaclxomuoxsyyxdzht.supabase.co/storage/v1/object/public/token-images//Tekengebied%2012Transparent.png'
        theme={{ backgroundColor: '#ffffff', foregroundColor: '#000000' }}
      />
    </>
  );
}
