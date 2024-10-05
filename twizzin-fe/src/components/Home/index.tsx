'use client';

import { useTranslation } from 'react-i18next';
// import { useRouter, usePathname } from 'next/navigation';
import {
  ScreenContainer,
  TwizzinLogo,
  GradientContainer,
  Column,
  H3,
  H3Brand,
} from '@/components';
import MoreInfo from './MoreInfo';
import { Landing } from './Landing';

export const HomeComponent = () =>
  //   {
  //   params: { lang },
  // }: {
  //   params: { lang: string };
  // }
  {
    const { t, i18n } = useTranslation();
    // const router = useRouter();
    // const pathname = usePathname();

    // const changeLanguage = (newLang: string) => {
    //   i18n.changeLanguage(newLang);
    //   const newPath = pathname!.replace(`/${lang}`, `/${newLang}`);
    //   router.push(newPath);
    // };

    return (
      <ScreenContainer>
        {/* <h1 className='text-4xl font-bold'>{t('Welcome')}</h1>
      <p className='text-xl'>{t('Hello')}</p>
      <div className='flex gap-4'>
        <button
          onClick={() => changeLanguage('en')}
          className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition'
        >
          English
        </button>
        <button
          onClick={() => changeLanguage('es')}
          className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition'
        >
          Español
        </button>
        <button
          onClick={() => changeLanguage('de')}
          className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition'
        >
          Deutsch
        </button>
      </div> */}
        <Column className='gap-4 w-full lg:w-1/2 mx-auto'>
          <GradientContainer>
            <Column>
              <H3Brand className='mr-2 ml-2 mt-2'>TWIZZIN</H3Brand>
            </Column>
            <TwizzinLogo />
            <H3>Proof of Learn</H3>
            <H3>{t('The Web3 trivia game built on Solana')}</H3>
            <Landing />
          </GradientContainer>
          <MoreInfo />
        </Column>
      </ScreenContainer>
    );
  };
