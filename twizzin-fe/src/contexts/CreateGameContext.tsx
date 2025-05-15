'use client';

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useRef,
  useCallback,
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
    username: userProfile?.username || '',
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
    setQuestions((prevQuestions) => {
      // Check if the question already exists
      const existingIndex = prevQuestions.findIndex(
        (q) => q.displayOrder === updatedQuestion.displayOrder
      );

      if (existingIndex === -1) {
        // Question doesn't exist, add it to the array
        return [...prevQuestions, updatedQuestion];
      } else {
        // Question exists, update it
        return prevQuestions.map((q) =>
          q.displayOrder === updatedQuestion.displayOrder ? updatedQuestion : q
        );
      }
    });
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

        // Reset form after successful creation

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
    setGameData({
      ...initialGameData,
      username: userProfile?.username || '',
    });
    setQuestions([blankQuestion]);
    setImageFile(null);
    setError(null);
  };

  const handleBulkQuestionUpdate = (newQuestions: QuestionForDb[]) => {
    // Ensure all questions have their displayOrder correctly set
    const updatedQuestions = newQuestions.map((q, index) => ({
      ...q,
      displayOrder: typeof q.displayOrder === 'number' ? q.displayOrder : index,
    }));
    setQuestions(updatedQuestions);
  };

  const isUpdatingGameDataRef = useRef(false);
  // Function to format and update game data from DB format
  const formatAndUpdateGameData = useCallback((dbGameData: any) => {
    if (!dbGameData || isUpdatingGameDataRef.current) return;

    isUpdatingGameDataRef.current = true;

    try {
      // Convert database format to form state format
      const formattedGameData = {
        gameName: dbGameData.name || '',
        entryFee: (dbGameData.entry_fee || 0) / LAMPORTS_PER_SOL,
        startTime: new Date(dbGameData.start_time || Date.now()),
        commission: (dbGameData.commission_bps || 0) / 100,
        donation: (dbGameData.donation_amount || 0) / LAMPORTS_PER_SOL,
        maxWinners: dbGameData.max_winners || 1,
        evenSplit: !!dbGameData.even_split,
        allAreWinners: !!dbGameData.all_are_winners,
        username: dbGameData.username || '',
        gameCode: dbGameData.game_code || '',
      };

      // Update game data in one operation to reduce re-renders
      setGameData((prev) => ({
        ...prev,
        ...formattedGameData,
      }));

      // If there are questions, update them in a single operation
      if (dbGameData.questions && Array.isArray(dbGameData.questions)) {
        const formattedQuestions = dbGameData.questions.map((q: any) => ({
          id: q.id,
          displayOrder: q.display_order,
          questionText: q.question_text || '',
          timeLimit: q.time_limit || 10,
          correctAnswer: q.correct_answer || '',
          answers: (q.answers || []).map((a: any) => ({
            displayOrder: a.display_order,
            answerText: a.answer_text || '',
            isCorrect: !!a.is_correct,
            displayLetter: a.display_letter || '',
          })),
        }));

        // Use a single bulk update rather than individual updates
        setQuestions(formattedQuestions);
      }
    } finally {
      // Always reset the flag
      isUpdatingGameDataRef.current = false;
    }
  }, []);

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
        isCreating,
        error,
        clearError: () => setError(null),
        imageFile,
        handleImageChange,
        resetForm,
        formatAndUpdateGameData,
        handleBulkQuestionUpdate,
      }}
    >
      {children}
    </CreateGameContext.Provider>
  );
};
