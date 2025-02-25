'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AppContextType, GameReward, UserProfile } from '@/types';
import { usePathname, useRouter } from 'next/navigation';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
import { localeMap, getPlayerDataWithRewards } from '@/utils';
import { processPlayerRewardsResponse } from '@/types/dbTypes'; // Import the helper function
import { CreateGameProvider } from './CreateGameContext';
import { GameContextProvider } from './GameContext';

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
  const [userXP, setUserXP] = useState<number>(0);
  const [userRewards, setUserRewards] = useState<GameReward[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
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

  const { connection } = useConnection();
  const { publicKey } = useWallet();

  // Fetch user data (profile, XP, and rewards) in a single function
  const fetchUserXPAndRewards = useCallback(async () => {
    if (!publicKey || !connection) return;

    try {
      // Get player data from the new function
      const playerData = await getPlayerDataWithRewards(publicKey.toString());

      if (playerData) {
        // Process the data into the format your app expects
        const { userProfile, gameRewards } =
          processPlayerRewardsResponse(playerData);

        // Update state with the processed data
        setUserProfile(userProfile);
        setUserXP(userProfile.totalXP);
        setUserRewards(gameRewards);
      } else {
        // Handle case where player data doesn't exist yet
        console.log('No player data found for wallet:', publicKey.toString());
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  }, [publicKey, connection]);

  // Use the fetch function when wallet connects
  useEffect(() => {
    if (!publicKey || !connection) return;
    fetchUserXPAndRewards();
  }, [publicKey, connection, fetchUserXPAndRewards]);
  console.log('userProfile', userProfile?.username);
  console.log('userRewards', userRewards);
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
        userXP,
        userRewards,
        fetchUserXPAndRewards,
        userProfile,
      }}
    >
      <CreateGameProvider>
        <GameContextProvider>{children}</GameContextProvider>
      </CreateGameProvider>
    </AppContext.Provider>
  );
};
