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
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppProvider;
