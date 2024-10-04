export interface AppContextType {
  isSignedIn: boolean;
  setIsSignedIn: (value: boolean) => void;
  admin: object | null;
  setAdmin: (admin: any) => void;
  gameData: any;
  handleGameData: (data: any) => void;
  questions: QuestionForDb[];
  handleAddQuestion: (question: QuestionForDb) => void;
  handleDeleteQuestion: (index: number) => void;
}

export interface QuestionForDb {
  id?: string;
  displayOrder: number;
  question: string;
  answers: string[];
  correctAnswer: string;
}

export interface AnswerToBeHashed {
  displayOrder: number;
  answer: string;
  // use question id returned from db max 32 chars
  salt: string;
}

export interface GameData {
  // gameCode is 6 chars max - returned from db
  gameName: string;
  entryFee: number;
  startTime: Date;
  commission: number;
  donation: number;
  maxWinners: number;
  answers: AnswerToBeHashed[];
}
