'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { AppContextType } from '@/types';
import { usePathname, useRouter } from 'next/navigation';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
import { localeMap } from '@/utils';
import { CreateGameProvider } from './CreateGameContext';
import { JoinGameContextProvider } from './JoinGameContext';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
};

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();

  const [isSignedIn, setIsSignedIn] = useState(false);
  const [admin, setAdmin] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  // Initialize language from localStorage or default to 'en'
  const [language, setLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('language') || 'en';
    }
    return 'en';
  });
  useEffect(() => {
    const urlSegments = pathname.split('/').filter(Boolean); // This removes empty strings
    const urlLocale = urlSegments[0];
    const supportedLocales = ['en', 'es', 'de'];

    if (!supportedLocales.includes(urlLocale)) {
      // Get the path after the locale segment, or default to empty string
      const pathAfterLocale = urlSegments.slice(1).join('/');
      // Construct new path with 'en' and the rest of the path
      const newPath = `/en/${pathAfterLocale}`;
      router.replace(newPath);
      return;
    }

    if (urlLocale !== language) {
      setLanguage(urlLocale);
      localStorage.setItem('language', urlLocale);
      if (i18n.isInitialized) {
        i18n.changeLanguage(urlLocale);
      }
    }
  }, [pathname, language, router]);

  // Handle language changes and synchronization
  useEffect(() => {
    // Skip if i18n is not initialized
    if (!i18n.isInitialized) {
      return;
    }

    const handleLanguageChange = () => {
      const newLanguage = i18n.language;
      setLanguage(newLanguage);
      localStorage.setItem('language', newLanguage);
      const newLocale = localeMap[newLanguage as keyof typeof localeMap];
      localStorage.setItem('locale', newLocale);

      // Update URL path when language changes
      const currentLang = pathname.split('/')[1];
      if (currentLang !== newLanguage && currentLang) {
        const newPath = pathname.replace(`/${currentLang}`, `/${newLanguage}`);
        router.push(newPath);
      }
    };

    // Set initial language if different from current i18n language
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }

    // Listen for language changes
    i18n.on('languageChanged', handleLanguageChange);

    // Cleanup listener on unmount
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [language, pathname, router]);

  // CURRENCY
  const [currency, setCurrency] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('currency') || 'USD';
    }
    return 'USD';
  });

  const changeCurrency = (newCurrency: string) => {
    setCurrency(newCurrency);
    localStorage.setItem('currency', newCurrency);
    // TODO - add logic here to convert prices
  };

  return (
    <AppContext.Provider
      value={{
        isSignedIn,
        setIsSignedIn,
        admin,
        setAdmin,
        language,
        changeLanguage: (newLang: string) => {
          if (i18n.isInitialized) {
            i18n.changeLanguage(newLang);
          }
        },
        t,
        currency,
        changeCurrency,
      }}
    >
      <CreateGameProvider>
        <JoinGameContextProvider>{children}</JoinGameContextProvider>
      </CreateGameProvider>
    </AppContext.Provider>
  );
};
