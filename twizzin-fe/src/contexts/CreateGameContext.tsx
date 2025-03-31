'use client';

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from 'react';
import { NATIVE_MINT } from '@solana/spl-token';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  CreateGameContextType,
  QuestionForDb,
  CreateGameData,
  CreateGameCombinedParams,
  GameDataChangeEvent,
  GameCreationResult,
  UpdateGameCombinedParams,
} from '@/types';
import { createGameCombined, updateGameCombined } from '@/utils';
import { useProgram } from './ProgramContext';
import { useAppContext } from './AppContext';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

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
  const { t, userProfile } = useAppContext();
  const { program } = useProgram();
  const wallet = useWallet();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = wallet;

  const initialGameData: CreateGameData = {
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
    username: '',
  };

  const [gameData, setGameData] = useState<CreateGameData>(initialGameData);

  useEffect(() => {
    if (userProfile?.username) {
      setGameData((prevData) => ({
        ...prevData,
        username: userProfile.username,
      }));
    }
  }, [userProfile?.username]);

  const handleGameData = (e: GameDataChangeEvent) => {
    const { name, type } = e.target;
    let value;

    if (type === 'checkbox') {
      value = (e.target as HTMLInputElement).checked;
    } else if (name === 'startTime') {
      // Special handling for date objects
      value = e.target.value;
    } else {
      value = e.target.value;
    }

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

  const [creationResult, setCreationResult] =
    useState<GameCreationResult | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [totalTime, setTotalTime] = useState<number>(0);

  useEffect(() => {
    const totalTime = questions.reduce(
      (acc, question) => acc + question.timeLimit,
      0
    );
    setTotalTime(totalTime);
  }, [questions]);

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
  };

  const handleCreateGame = async (): Promise<GameCreationResult | null> => {
    if (!program) {
      setError(t('Program not initialized'));
      return null;
    }

    if (!publicKey) {
      setError(t('Please connect your wallet'));
      return null;
    }

    if (!sendTransaction) {
      setError(t('Wallet adapter not properly initialized'));
      return null;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Check if this is an update (gameCode exists) or create
      const isUpdate = !!gameData.gameCode;

      // Get correct decimals for token
      const entryFeeInLamports = gameData.entryFee * LAMPORTS_PER_SOL;
      const donationInLamports = gameData.donation * LAMPORTS_PER_SOL;

      // Calculate end time based on start time and total time
      const endTime = new Date(gameData.startTime.getTime() + totalTime * 1000);

      if (isUpdate) {
        // Handle game update
        const params: UpdateGameCombinedParams = {
          gameCode: gameData.gameCode!,
          name: gameData.gameName,
          entryFee: entryFeeInLamports,
          commission: gameData.commission * 100, // Convert to basis points
          startTime: gameData.startTime,
          endTime: endTime,
          maxWinners: gameData.maxWinners,
          tokenMint: NATIVE_MINT,
          donationAmount: donationInLamports,
          evenSplit: gameData.evenSplit,
          allAreWinners: gameData.allAreWinners,
          questions: questions,
          imageFile: imageFile,
          username: gameData.username,
        };

        const result = await updateGameCombined(
          program,
          connection,
          publicKey,
          sendTransaction,
          params
        );

        setCreationResult(result);
        return result;
      } else {
        // Handle new game creation
        const params: CreateGameCombinedParams = {
          name: gameData.gameName,
          entryFee: entryFeeInLamports,
          commission: gameData.commission * 100, // Convert to basis points
          startTime: gameData.startTime,
          endTime: endTime,
          maxWinners: gameData.maxWinners,
          tokenMint: NATIVE_MINT,
          donationAmount: donationInLamports,
          evenSplit: gameData.evenSplit,
          allAreWinners: gameData.allAreWinners,
          questions: questions,
          imageFile: imageFile,
          username: gameData.username,
        };

        const result = await createGameCombined(
          program,
          connection,
          publicKey,
          sendTransaction,
          params
        );

        setCreationResult(result);

        // Reset form after successful creation
        setGameData(initialGameData);
        setQuestions([blankQuestion]);
        setImageFile(null);

        return result;
      }
    } catch (err: unknown) {
      console.error('Failed to create/update game:', err);
      setError(
        err instanceof Error ? err.message : t('Failed to create/update game')
      );
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  // Function to reset the form to initial state
  const resetForm = () => {
    setGameData(initialGameData);
    setQuestions([blankQuestion]);
    setImageFile(null);
    setCreationResult(null);
    setError(null);
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
        totalTime,
        creationResult,
        isCreating,
        error,
        clearCreationResult: () => setCreationResult(null),
        clearError: () => setError(null),
        imageFile,
        handleImageChange,
        resetForm,
      }}
    >
      {children}
    </CreateGameContext.Provider>
  );
};
