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
import { AppContextType, GameReward, UserProfile, GameHistory } from '@/types';
import { usePathname, useRouter } from 'next/navigation';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
import { localeMap } from '@/utils';
import { processPlayerRewardsResponse } from '@/types/dbTypes';
import { authenticatedApiClient } from '@/utils/api/authenticatedClient';
import { CreateGameProvider } from './CreateGameContext';
import { GameContextProvider } from './GameContext';
import { BetaModal, AuthModal } from '@/components/modals';
import { useSupabaseAuth } from './SupabaseAuthContext';

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
  const [unclaimedRewards, setUnclaimedRewards] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [level, setLevel] = useState<number>(0);
  const [nextLevelXP, setNextLevelXP] = useState<number>(300);
  const [progress, setProgress] = useState<number>(0);
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const router = useRouter();
  const pathname = usePathname();

  const [isBetaModalOpen, setIsBetaModalOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalDismissed, setAuthModalDismissed] = useState(false);
  const [wasAuthenticated, setWasAuthenticated] = useState(false);
  // When an AuthGuard with requireAuth=true is mounted, it manages its own
  // AuthModal. The global AuthModal rendered in this provider should be
  // suppressed to avoid two overlapping modals.
  const [authGuardActive, setAuthGuardActive] = useState(false);
  const { loading, error, signInWithSupabase, supabaseUser } =
    useSupabaseAuth();

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
  const { publicKey, connected } = useWallet();

  // Reset auth modal dismissed state and clear user data when wallet disconnects
  useEffect(() => {
    if (!connected) {
      setAuthModalDismissed(false);
      setShowAuthModal(false);
      // Clear all user data when wallet disconnects
      setUserXP(0);
      setUserRewards([]);
      setUnclaimedRewards(0);
      setUserProfile(null);
      setLevel(0);
      setNextLevelXP(300);
      setProgress(0);
      setGameHistory([]);
    }
  }, [connected]);

  // Track when user becomes authenticated
  useEffect(() => {
    if (connected && supabaseUser) {
      setWasAuthenticated(true);
    }
  }, [connected, supabaseUser]);

  // Reset authentication tracking when wallet disconnects
  useEffect(() => {
    if (!connected) {
      setWasAuthenticated(false);
    }
  }, [connected]);

  // Show auth modal when wallet connects (if not already authenticated and not dismissed)
  // Don't show if user was previously authenticated (to avoid showing on token refresh issues)
  useEffect(() => {
    if (connected && publicKey && !supabaseUser && !authModalDismissed && !wasAuthenticated) {
      setShowAuthModal(true);
    }
  }, [connected, publicKey, supabaseUser, authModalDismissed, wasAuthenticated]);

  // Fetch user data (profile, XP, and rewards) in a single function
  const fetchUserXPAndRewards = useCallback(async () => {
    if (!publicKey || !connection || !supabaseUser) return;

    try {
      // Fetch detailed XP data including level and game history
      const xpResult = await authenticatedApiClient.getUserXP();

      if (xpResult.success && xpResult.data) {
        const xpData = xpResult.data;
        setUserXP(xpData.currentXP);
        setLevel(xpData.level);
        setNextLevelXP(xpData.nextLevelXP);
        setProgress(xpData.progress);
        setGameHistory(xpData.gameHistory);
      }

      // Fetch basic player data and rewards
      const rewardsResult = await authenticatedApiClient.getUserRewards();

      if (rewardsResult.success && rewardsResult.data) {
        const { userProfile, gameRewards } = processPlayerRewardsResponse(
          rewardsResult.data
        );
        setUserProfile(userProfile);
        setUserRewards(gameRewards);
      } else {
        console.log('No player data found for wallet:', publicKey.toString());
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  }, [publicKey, connection, supabaseUser]);

  // Clear user data when supabaseUser changes (wallet switching)
  useEffect(() => {
    if (!supabaseUser) {
      // Clear all user data when user signs out or switches wallets
      setUserXP(0);
      setUserRewards([]);
      setUnclaimedRewards(0);
      setUserProfile(null);
      setLevel(0);
      setNextLevelXP(300);
      setProgress(0);
      setGameHistory([]);
    }
  }, [supabaseUser]);

  useEffect(() => {
    if (!publicKey || !connection || !supabaseUser) return;
    fetchUserXPAndRewards();
  }, [publicKey, connection, supabaseUser, fetchUserXPAndRewards]);

  useEffect(() => {
    const unclaimedRewards = userRewards.filter(
      (reward) => !reward.claimed
    ).length;
    setUnclaimedRewards(unclaimedRewards);
  }, [userRewards]);

  return (
    <AppContext.Provider
      value={{
        isSignedIn,
        setIsSignedIn,
        isAuthenticated: connected && !!supabaseUser,
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
        level,
        nextLevelXP,
        progress,
        gameHistory,
        unclaimedRewards,
        setIsBetaModalOpen,
        showAuthModal,
        setShowAuthModal,
        authModalDismissed,
        setAuthModalDismissed,
        signInWithSupabase,
        setAuthGuardActive,
      }}
    >
      <CreateGameProvider>
        <GameContextProvider>{children}</GameContextProvider>
      </CreateGameProvider>
      {isBetaModalOpen && (
        <BetaModal
          isOpen={isBetaModalOpen}
          onClose={() => setIsBetaModalOpen(false)}
        />
      )}
      {/* Only render the global AuthModal when no AuthGuard is active on the
          current page. AuthGuard manages its own modal instance. */}
      {!authGuardActive && (
        <AuthModal
          isOpen={showAuthModal && !supabaseUser}
          loading={loading}
          error={error}
          onAuthenticate={signInWithSupabase}
          onClose={() => {
            setShowAuthModal(false);
            setAuthModalDismissed(true);
          }}
        />
      )}
    </AppContext.Provider>
  );
};
