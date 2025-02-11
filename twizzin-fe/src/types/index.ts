import { PublicKey } from '@solana/web3.js';
import { TFunction } from 'i18next';

/* eslint-disable no-unused-vars */
export interface AppContextType {
  isSignedIn: boolean;
  setIsSignedIn: (value: boolean) => void;
  admin: any;
  setAdmin: (value: any) => void;
  language: string;
  changeLanguage: (lang: string) => void;
  t: TFunction;
  currency: string;
  changeCurrency: (currency: string) => void;
}

export type GameDataChangeEvent = {
  target: {
    name: string;
    value: string | number;
    type: string;
  };
};

export interface GameCreationResult {
  onChain: {
    success: boolean;
    signature: string | null;
    error: string | null;
  };
  database: {
    game: {
      id: string;
      game_code: string;
      game_pubkey: string;
      admin_wallet: string;
      name: string;
      token_mint: string;
      entry_fee: number;
      commission_bps: number;
      start_time: string;
      end_time: string;
      max_winners: number;
      donation_amount: number;
      is_native: boolean;
      all_are_winners: boolean;
      even_split: boolean;
      answer_merkle_root: string;
      img_url: string;
      created_at: string;
    };
    questions: Array<{
      id: string;
      game_id: string;
      question_text: string;
      display_order: number;
      correct_answer: string;
      time_limit: number;
      created_at: string;
    }>;
    answers: Array<{
      id: string;
      question_id: string;
      answer_text: string;
      display_letter: string;
      display_order: number;
      is_correct: boolean;
      created_at: string;
    }>;
  };
}

export interface CreateGameContextType {
  gameData: CreateGameData;
  handleGameData: (e: GameDataChangeEvent) => void;
  questions: QuestionForDb[];
  handleUpdateQuestionData: (question: QuestionForDb) => void;
  handleDeleteQuestion: (displayOrder: number) => void;
  handleAddBlankQuestion: () => void;
  handleCreateGame: () => Promise<void>;
  totalTime: number;
  creationResult: GameCreationResult | null;
  isCreating: boolean;
  error: string | null;
  clearCreationResult: () => void;
  clearError: () => void;
  imageFile: File | null;
  handleImageChange: (file: File | null) => void;
}

export interface GameInputForDb {
  gamePubkey: string;
  adminWallet: string;
  name: string;
  tokenMint: string;
  entryFee: number;
  commissionBps: number;
  startTime: string;
  endTime: string;
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

export interface CreateGameData {
  gameCode?: string; // length of 6
  gameName: string;
  entryFee: number;
  startTime: Date;
  // endTime: Date;
  commission: number;
  donation: number;
  maxWinners: number;
  // answers: AnswerToBeHashed[];
  evenSplit: boolean;
  allAreWinners: boolean;
}

export interface CreateGameCombinedParams {
  name: string;
  entryFee: number;
  commission: number;
  startTime: Date;
  endTime: Date;
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

export interface PartialGame {
  game_code: string;
  id: string;
  admin_wallet: string;
  name: string;
  token_mint: string;
  entry_fee: number;
  commission_bps: number;
  start_time: string;
  end_time: string;
  max_winners: number;
  donation_amount: number;
  is_native: boolean;
  all_are_winners: boolean;
  even_split: boolean;
  img_url: string | null;
  question_count: number;
}

export interface GameContextType {
  gameCode: string;
  setGameCode: (value: string) => void;
  partialGameData: PartialGame | null;
  getGameByCode: (gameCode: string) => Promise<void>;
  gameData: JoinFullGame;
  handleJoinGame: () => Promise<void>;
  isAdmin: boolean;
}

export interface JoinGameParams {
  gameCode: string;
  admin: PublicKey;
  tokenMint: PublicKey;
  playerTokenAccount?: PublicKey;
  vaultTokenAccount?: PublicKey;
  entryFee: number;
}

export interface JoinFullGame {
  game_code: string;
  id: string;
  admin_wallet: string;
  name: string;
  token_mint: string;
  entry_fee: number;
  commission_bps: number;
  start_time: string;
  end_time: string;
  max_winners: number;
  donation_amount: number;
  is_native: boolean;
  all_are_winners: boolean;
  even_split: boolean;
  img_url: string | null;
  question_count: number;
}
