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
  gameCode: string;
  setGameCode: (code: string) => void;
  language: string;
  changeLanguage: (language: string) => void;
  t: (key: string) => string;
  currency: string;
  changeCurrency: (currency: string) => void;
}

export interface QuestionForDb {
  id?: string;
  displayOrder: number;
  question: string;
  answers: Answer[];
  correctAnswer: string;
  timeLimit: number;
}

export interface Answer {
  displayOrder: number;
  answerText: string;
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
  commission: number;
  donation: number;
  maxWinners: number;
  answers: AnswerToBeHashed[];
}

export interface CarouselItem {
  title: string;
  description: string;
  image: string;
  order: number;
}
