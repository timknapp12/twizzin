export interface AppContextType {
  isSignedIn: boolean;
  setIsSignedIn: (value: boolean) => void;
  admin: object | null;
  setAdmin: (admin: any) => void;
  gameTitle: string;
  setGameTitle: (value: string) => void;
  gameTime: Date | null;
  setGameTime: (value: Date | null) => void;
}
