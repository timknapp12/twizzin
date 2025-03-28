import { GameState } from '@/utils';
import { PublicKey } from '@solana/web3.js';
import { TFunction } from 'i18next';

export * from './dbTypes';

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
  userXP: number;
  userRewards: GameReward[];
  fetchUserXPAndRewards: () => Promise<void>;
  userProfile: UserProfile | null;
  level?: number;
  nextLevelXP?: number;
  progress?: number;
  gameHistory?: GameHistory[];
  unclaimedRewards?: number;
}

export interface UserProfile {
  walletAddress: string;
  username: string;
  totalXP: number;
  createdAt: string;
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
  handleCreateGame: () => Promise<GameCreationResult | null>;
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
  username?: string;
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
  username?: string;
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
  username?: string;
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
  username: string | null;
}

export interface GameContextType {
  username: string;
  setUsername: (value: string) => void;
  gameCode: string;
  setGameCode: (value: string) => void;
  partialGameData: PartialGame | null;
  getGameByCode: (gameCode: string) => Promise<void>;
  gameData: JoinFullGame;
  handleJoinGame: () => Promise<string | null>;
  isAdmin: boolean;
  submitAnswer: (answer: GameAnswer) => void;
  getCurrentAnswer: (questionId: string) => GameAnswer | undefined;
  getGameProgress: () => {
    isComplete: boolean;
    answeredCount: number;
    remainingCount: number;
  };
  handleStartGame: () => Promise<void>;
  handleSubmitAnswers: () => Promise<string | undefined>;
  gameResult: GameResultFromDb | null;
  handleEndGame: () => Promise<string | null>;
  canEndGame: boolean;
  isLoadingResults: boolean;
  loadError: string | null;
  gameState: GameState;
  setGameStateWithMetadata: (state: GameState, metadata?: any) => void;
  canTransitionTo: (targetState: GameState) => boolean;
}

export interface JoinGameParams {
  gameCode: string;
  admin: PublicKey;
  tokenMint: PublicKey;
  playerTokenAccount?: PublicKey;
  vaultTokenAccount?: PublicKey;
  entryFee: number;
  username?: string;
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
  questions: QuestionFromDb[];
  status: string | 'not_started';
  username: string | null;
}

export interface QuestionFromDb {
  id: string;
  game_id: string;
  question_text: string;
  display_order: number;
  correct_answer: string;
  answers: AnswerFromDb[];
}

export interface AnswerFromDb {
  id: string;
  question_id: string;
  answer_text: string;
  display_letter: string;
  display_order: number;
  is_correct: boolean;
}

// Types for storage
export interface GameAnswer {
  questionId: string;
  answerId: string;
  answer: string;
  displayOrder: number;
  timestamp: number;
  displayLetter: string;
}

export interface StoredGameSession {
  gameCode: string;
  gamePubkey: string;
  startTime: number;
  answers: {
    [questionId: string]: {
      displayOrder: number;
      answer: string;
      questionId: string;
    };
  };
  submitted: boolean;
  submittedTime?: number;
}

export interface GameStartStatus {
  [gameCode: string]: {
    isManuallyStarted: boolean; // Only true when admin explicitly starts the game
    actualStartTime: number; // When admin started the game
    actualEndTime: number; // Calculated end time from when admin started
  };
}

// START GAME
export interface StartGameResult {
  success: boolean;
  signature: string | null;
  error: string | null;
  startTime?: number;
  endTime?: number;
}

export interface AnswerInput {
  displayOrder: number;
  answer: string;
  questionId: string;
  proof: number[][];
}

export interface SubmitAnswersParams {
  admin: PublicKey;
  gameCode: string;
  answers: AnswerInput[];
  clientFinishTime: number;
}

export interface GameSession {
  answers: Array<{
    displayOrder: number;
    answer: string;
    questionId: string;
  }>;
  startTime: number;
  finishTime: number;
  submitted: boolean;
}

export interface SubmitAnswersToDbParams {
  gameId: string;
  playerWallet: string;
  gameSession: {
    answers: VerifiedAnswer[];
    startTime?: number | string;
    finishTime: string;
  };
  signature: string;
  numCorrect: number;
}

export interface VerifiedAnswer {
  displayOrder: number;
  answer: string;
  questionId: string;
  proof: number[][];
  isCorrect: boolean;
}

export interface VerifyAnswersResult {
  answers: VerifiedAnswer[];
  numCorrect: number;
}

export interface GameResultQuestion {
  questionId: string;
  questionText: string;
  userAnswer: {
    text: string;
    displayLetter: string;
  } | null;
  correctAnswer: {
    text: string;
    displayLetter: string;
  };
  isCorrect: boolean;
  displayOrder: number;
}

export interface GameResultFromDb {
  answeredQuestions: GameResultQuestion[];
  totalCorrect: number;
  totalQuestions: number;
  completedAt: string | null;
  winners?: PlayerResult[];
  leaderboard?: PlayerResult[];
  finalRank?: number;
  xpEarned?: number;
  rewardsEarned?: number;
  startTime?: string;
  endTime?: string;
}

interface PlayerAnswerFromDbResult {
  question_id: string;
  selected_answer: string;
  is_correct: boolean;
  answered_at: string;
}

interface PlayerGameFromDbResult {
  id: string;
  num_correct: number;
  finished_time: string | null;
  final_rank?: number;
  xp_earned?: number;
  rewards_earned?: number;
  player_answers: PlayerAnswerFromDbResult[];
}

interface QuestionFromDbResult {
  id: string;
  question_text: string;
  display_order: number;
  answers: AnswerFromDbResult[];
}

interface AnswerFromDbResult {
  id: string;
  answer_text: string;
  display_letter: string;
  is_correct: boolean;
}

export interface RawGameResult {
  playerGame: PlayerGameFromDbResult;
  questions: QuestionFromDbResult[];
}

export interface PlayerSubmission {
  player_wallet: string;
  num_correct: number;
  finished_time: number;
  username?: string;
}

export interface PlayerResult {
  wallet: string;
  numCorrect: number;
  finishTime: number;
  rank?: number | null;
  isWinner: boolean;
  xpEarned?: number;
  rewardsEarned?: number;
  username?: string | null;
}

export interface GameResults {
  winners: PlayerResult[];
  allPlayers: PlayerResult[];
}

// user rewards
export interface GameReward {
  gameId: string;
  gameName: string;
  imageUrl: string | null;
  rewardAmount: number;
  tokenMint: string;
  tokenSymbol: string;
  claimed: boolean;
  decimals: number;
  gameCode: string;
  isNative: boolean;
  adminWallet: string;
}

interface GameInfo {
  name: string;
  img_url: string | null;
  token_mint: string;
}

// user XP
export interface XPDistributionConfig {
  baseParticipationXP: number; // XP for participating
  winnerBaseXP: number; // Additional base XP for being a winner
  firstPlaceBonus: number; // Additional XP for first place
  answerXPMultiplier: number; // XP multiplier per correct answer
}

export const DEFAULT_XP_CONFIG: XPDistributionConfig = {
  baseParticipationXP: 50,
  winnerBaseXP: 100,
  firstPlaceBonus: 50,
  answerXPMultiplier: 10,
};

export interface XPAward {
  wallet: string;
  xpAmount: number;
  reason: string;
}

// get winners
export interface OnChainWinner {
  player: PublicKey;
  rank: number;
  prizeAmount: bigint;
  claimed: boolean;
}

export interface GameHistory {
  gameId: string;
  gameName: string;
  gameDate: string;
  questionsCorrect: number;
  totalQuestions: number;
  xpEarned: number;
  finalRank: number | null;
}

export interface XPLevelData {
  currentXP: number;
  level: number;
  nextLevelXP: number;
  progress: number;
  gameHistory: GameHistory[];
}
