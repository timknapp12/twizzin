import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { createContext, useContext, useEffect, useState } from 'react';
import { isDev, PROGRAM_CONSTANTS } from '../config/constants';
import { IDL, TwizzinIdl } from '../types/idl';

interface ProgramContextState {
  program: Program<TwizzinIdl> | null;
  provider: AnchorProvider | null;
  isWalletConnected: boolean;
}

export const ProgramContext = createContext<ProgramContextState>({
  program: null,
  provider: null,
  isWalletConnected: false,
});

export const ProgramContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [state, setState] = useState<ProgramContextState>({
    program: null,
    provider: null,
    isWalletConnected: false,
  });

  useEffect(() => {
    const initProgram = async () => {
      if (!wallet) {
        setState({
          program: null,
          provider: null,
          isWalletConnected: false,
        });
        return;
      }

      try {
        const provider = new AnchorProvider(connection, wallet, {
          commitment: 'confirmed',
          preflightCommitment: 'confirmed',
        });

        const programId = isDev
          ? PROGRAM_CONSTANTS.DEVNET.PROGRAM_ID
          : PROGRAM_CONSTANTS.MAINNET.PROGRAM_ID;

        const program = await Program.at<TwizzinIdl>(programId, provider);

        setState({
          program,
          provider,
          isWalletConnected: true,
        });
      } catch (error) {
        console.error('Error initializing program:', error);
        if (error instanceof Error) {
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
          });
        }
        setState({
          program: null,
          provider: null,
          isWalletConnected: false,
        });
      }
    };

    initProgram();
  }, [connection, wallet]);

  return (
    <ProgramContext.Provider value={state}>{children}</ProgramContext.Provider>
  );
};

export const useProgram = () => {
  const context = useContext(ProgramContext);
  if (!context) {
    throw new Error('useProgram must be used within ProgramContextProvider');
  }
  return context;
};
