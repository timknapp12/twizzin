import { PublicKey } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { TwizzinIdl } from '@/types/idl';

/* eslint-disable no-unused-vars */
export interface AppContextType {
  isSignedIn: boolean;
  setIsSignedIn: (value: boolean) => void;
  admin: object | null;
  setAdmin: (admin: any) => void;
  gameData: any;
  handleGameData: (data: any) => void;
  questions: QuestionForDb[];
  handleUpdateQuestionData: (question: QuestionForDb) => void;
  handleDeleteQuestion: (index: number) => void;
  handleAddBlankQuestion: () => void;
  language: string;
  changeLanguage: (language: string) => void;
  t: (key: string) => string;
  currency: string;
  changeCurrency: (currency: string) => void;
  handleCreateGame: (
    program: Program<TwizzinIdl>,
    wallet: WalletContextState
  ) => void;
}

export interface GameInputForDb {
  gamePubkey: string;
  adminWallet: string;
  name: string;
  tokenMint: string;
  entryFee: number;
  commissionBps: number;
  startTime: Date;
  endTime: Date;
  maxWinners: number;
  donationAmount: number;
  isNative: boolean;
  allAreWinners: boolean;
  evenSplit: boolean;
  answerMerkleRoot: string;
  imgUrl?: string;
}

export interface QuestionForDb {
  id?: string;
  displayOrder: number;
  questionText: string;
  correctAnswer: string;
  timeLimit: number;
  answers: AnswerForDb[];
}

export interface AnswerForDb {
  answerText: string;
  displayLetter: string;
  displayOrder: number;
  isCorrect: boolean;
}

export const displayOrderMap = {
  0: 'A',
  1: 'B',
  2: 'C',
  3: 'D',
  4: 'E',
  5: 'F',
  6: 'G',
  7: 'H',
  8: 'I',
  9: 'J',
};

export interface AnswerToBeHashed {
  displayOrder: number;
  answer: string;
  // use question id returned from db max 32 chars
  salt: string;
}

export interface GameData {
  gameCode: string; // length of 6
  gameName: string;
  entryFee: number;
  startTime: Date;
  endTime: Date;
  commission: number;
  donation: number;
  maxWinners: number;
  answers: AnswerToBeHashed[];
  evenSplit: boolean;
  allAreWinners: boolean;
}

export interface CreateFullGameParams {
  name: string;
  entryFee: number;
  commission: number;
  startTime: number;
  endTime: number;
  maxWinners: number;
  tokenMint: PublicKey;
  donationAmount?: number;
  allAreWinners?: boolean;
  evenSplit?: boolean;
  adminTokenAccount?: PublicKey;
  questions: QuestionForDb[];
  imageFile: File | null;
}

export interface CarouselItem {
  title: string;
  description: string;
  image: string;
  order: number;
}
