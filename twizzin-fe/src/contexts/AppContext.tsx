'use client';
import { createContext, useContext, useState, ReactNode } from 'react';
import { AppContextType, QuestionForDb, GameData } from '@/types';

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

  const initialGameData = {
    gameName: '',
    entryFee: 0,
    startTime: new Date(),
    commission: 0,
    donation: 0,
    maxWinners: 0,
    answers: [],
  };
  const [gameData, setGameData] = useState(initialGameData);
  console.log('gameData', gameData);
  const handleGameData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setGameData((prevData) => ({
      ...prevData,
      [name]: name === 'startTime' ? new Date(value) : value,
    }));
  };

  const [questions, setQuestions] = useState<QuestionForDb[]>([]);

  const handleAddQuestion = (question: QuestionForDb) => {
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
        gameData,
        handleGameData,
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
