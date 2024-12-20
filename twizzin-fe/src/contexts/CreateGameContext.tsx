'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Program } from '@coral-xyz/anchor';
import { TwizzinIdl } from '@/types/idl';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { NATIVE_MINT } from '@solana/spl-token';
import {
  CreateGameContextType,
  QuestionForDb,
  GameData,
  CreateFullGameParams,
  GameDataChangeEvent,
} from '@/types';
import { createFullGame } from '@/utils';

const CreateGameContext = createContext<CreateGameContextType | undefined>(
  undefined
);

export const useCreateGameContext = () => {
  const context = useContext(CreateGameContext);
  if (!context) {
    throw new Error(
      'useCreateGameContext must be used within a CreateGameProvider'
    );
  }
  return context;
};

const CreateGameProvider = ({ children }: { children: ReactNode }) => {
  const initialGameData: GameData = {
    gameCode: '',
    gameName: '',
    entryFee: 0,
    startTime: new Date(),
    endTime: new Date(),
    commission: 0,
    donation: 0,
    maxWinners: 1,
    answers: [],
    evenSplit: false,
    allAreWinners: false,
  };

  const [gameData, setGameData] = useState<GameData>(initialGameData);

  const handleGameData = (e: GameDataChangeEvent) => {
    const { name, value } = e.target;
    setGameData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const blankQuestion = {
    displayOrder: 0,
    questionText: '',
    answers: [
      {
        displayOrder: 0,
        answerText: '',
        isCorrect: false,
        displayLetter: 'A',
      },
    ],
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

  const handleCreateGame = async (
    program: Program<TwizzinIdl>,
    wallet: WalletContextState
  ) => {
    try {
      const params: CreateFullGameParams = {
        name: gameData.gameName,
        entryFee: gameData.entryFee,
        commission: gameData.commission * 100,
        startTime: new Date(gameData.startTime),
        endTime: new Date(gameData.endTime),
        maxWinners: gameData.maxWinners,
        tokenMint: NATIVE_MINT,
        donationAmount: gameData.donation,
        evenSplit: gameData.evenSplit,
        allAreWinners: gameData.allAreWinners,
        questions: questions,
        imageFile: null,
      };

      const result = await createFullGame(program, wallet, params);
      console.log('Game created successfully!', result);

      // Reset form
      setGameData(initialGameData);
      setQuestions([blankQuestion]);
    } catch (error) {
      console.error('Failed to create game:', error);
    }
  };

  return (
    <CreateGameContext.Provider
      value={{
        gameData,
        handleGameData,
        questions,
        handleUpdateQuestionData,
        handleDeleteQuestion,
        handleAddBlankQuestion,
        handleCreateGame,
      }}
    >
      {children}
    </CreateGameContext.Provider>
  );
};

export default CreateGameProvider;
