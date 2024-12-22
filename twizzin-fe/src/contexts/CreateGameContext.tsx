'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { NATIVE_MINT } from '@solana/spl-token';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  CreateGameContextType,
  QuestionForDb,
  GameData,
  CreateFullGameParams,
  GameDataChangeEvent,
  GameCreationResult,
} from '@/types';
import { createFullGame } from '@/utils';
import { useProgram } from './ProgramContext';

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

export const CreateGameProvider = ({ children }: { children: ReactNode }) => {
  const { program } = useProgram();
  const wallet = useWallet();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = wallet;

  const initialGameData: GameData = {
    gameName: '',
    entryFee: 0,
    startTime: new Date(),
    // endTime: new Date(),
    commission: 0,
    donation: 0,
    maxWinners: 1,
    // answers: [],
    evenSplit: false,
    allAreWinners: false,
  };

  const [gameData, setGameData] = useState<GameData>(initialGameData);

  const handleGameData = (e: GameDataChangeEvent) => {
    const { name, type } = e.target;
    const value =
      type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : e.target.value;

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

  const totalTime = questions.reduce(
    (acc, question) => acc + question.timeLimit,
    0
  );

  const [creationResult, setCreationResult] =
    useState<GameCreationResult | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
  };

  const handleCreateGame = async () => {
    if (!program) {
      console.error('Program not initialized');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const params: CreateFullGameParams = {
        name: gameData.gameName,
        entryFee: gameData.entryFee,
        commission: gameData.commission * 100,
        startTime: gameData.startTime,
        endTime: new Date(gameData.startTime.getTime() + totalTime * 1000),
        maxWinners: gameData.maxWinners,
        tokenMint: NATIVE_MINT,
        donationAmount: gameData.donation,
        evenSplit: gameData.evenSplit,
        allAreWinners: gameData.allAreWinners,
        questions: questions,
        imageFile: imageFile,
      };

      const result = await createFullGame(
        program,
        connection,
        publicKey!, // Add non-null assertion since we know publicKey exists at this point
        sendTransaction,
        params
      );
      setCreationResult(result);

      // Reset form
      setGameData(initialGameData);
      setQuestions([blankQuestion]);
      setImageFile(null);
    } catch (err: unknown) {
      console.error('Failed to create game CreateGameContext:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to create game CreateGameContext'
      );
    } finally {
      setIsCreating(false);
    }
  };

  console.log('gameData', gameData);
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
        totalTime,
        creationResult,
        isCreating,
        error,
        clearCreationResult: () => setCreationResult(null),
        clearError: () => setError(null),
        imageFile,
        handleImageChange,
      }}
    >
      {children}
    </CreateGameContext.Provider>
  );
};
