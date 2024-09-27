'use client';
import { createContext, useContext, useState, ReactNode } from 'react';
import { AppContextType, Question } from '@/types';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

const AppProvider = ({ children }: { children: ReactNode }) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [admin, setAdmin] = useState(null);

  const [gameTitle, setGameTitle] = useState<string>('');
  const [gameTime, setGameTime] = useState<Date | null>(new Date());
  const [questions, setQuestions] = useState<Question[]>([]);

  const handleAddQuestion = (question: Question) => {
    setQuestions((prevState) => [...prevState, question]);
  };

  const handleDeleteQuestion = (index: number) => {
    setQuestions((prevState) => prevState.filter((_, i) => i !== index));
  };

  return (
    <AppContext.Provider
      value={{
        isSignedIn,
        setIsSignedIn,
        admin,
        setAdmin,
        gameTitle,
        setGameTitle,
        gameTime,
        setGameTime,
        questions,
        handleAddQuestion,
        handleDeleteQuestion,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppProvider;
