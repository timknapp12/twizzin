'use client';
import { createContext, useContext, useState, ReactNode } from 'react';
import { AppContextType } from '@/types';

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
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppProvider;
