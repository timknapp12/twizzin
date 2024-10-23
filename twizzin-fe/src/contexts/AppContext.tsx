'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { AppContextType, QuestionForDb, GameData } from '@/types';
import { usePathname, useRouter } from 'next/navigation';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

const AppProvider = ({ children }: { children: ReactNode }) => {
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

  const initialGameData: GameData = {
    gameCode: '',
    gameName: '',
    entryFee: 0,
    startTime: new Date(),
    commission: 0,
    donation: 0,
    maxWinners: 1,
    answers: [],
  };

  const [gameData, setGameData] = useState<GameData>(initialGameData);

  const handleGameData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setGameData((prevData) => ({
      ...prevData,
      [name]: name === 'startTime' ? new Date(value) : value,
    }));
  };

  const blankQuestion = {
    displayOrder: 0,
    question: '',
    answers: [{ displayOrder: 0, answerText: '', isCorrect: false }],
    correctAnswer: '',
    timeLimit: 10,
  };

  const [questions, setQuestions] = useState<QuestionForDb[]>([blankQuestion]);

  const handleUpdateQuestionData = (updatedQuestion: QuestionForDb) => {
    setQuestions((prevQuestions) =>
      prevQuestions.map((q) =>
        q.displayOrder === updatedQuestion.displayOrder ? updatedQuestion : q
      )
    );
  };

  const handleAddBlankQuestion = () => {
    setQuestions((prevQuestions) => [
      ...prevQuestions,
      {
        ...blankQuestion,
        displayOrder: prevQuestions.length,
      },
    ]);
  };

  const handleDeleteQuestion = (displayOrder: number) => {
    if (questions.length > 1) {
      setQuestions((prevQuestions) => {
        const newQuestions = prevQuestions.filter(
          (q) => q.displayOrder !== displayOrder
        );
        return newQuestions.map((q, index) => ({ ...q, displayOrder: index }));
      });
    }
  };

  const [gameCode, setGameCode] = useState('');

  const changeLanguage = (newLang: string) => {
    if (i18n.isInitialized) {
      i18n.changeLanguage(newLang);
    }
  };

  return (
    <AppContext.Provider
      value={{
        isSignedIn,
        setIsSignedIn,
        admin,
        setAdmin,
        gameData,
        handleGameData,
        questions,
        handleUpdateQuestionData,
        handleDeleteQuestion,
        handleAddBlankQuestion,
        gameCode,
        setGameCode,
        language,
        changeLanguage,
        t,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppProvider;
