import { Program, AnchorProvider, Idl } from '@project-serum/anchor';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { createContext, useContext, useMemo, useEffect } from 'react';
import { isDev, PROGRAM_CONSTANTS } from '../config/constants';
import idl from '../../../twizzin-be-2/target/idl/twizzin_be_2.json';

interface ProgramContextState {
  program: Program | null;
  provider: AnchorProvider | null;
  isWalletConnected: boolean;
}

const ProgramContext = createContext<ProgramContextState>({
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

  const { program, provider, isWalletConnected } = useMemo(() => {
    if (!wallet) {
      return { program: null, provider: null, isWalletConnected: false };
    }

    try {
      const provider = new AnchorProvider(connection, wallet, {
        commitment: 'confirmed',
        preflightCommitment: 'confirmed',
      });

      const program = new Program(
        idl as unknown as Idl,
        isDev
          ? PROGRAM_CONSTANTS.DEVNET.PROGRAM_ID
          : PROGRAM_CONSTANTS.MAINNET.PROGRAM_ID,
        provider
      );

      return { program, provider, isWalletConnected: true };
    } catch (error) {
      console.error('Error initializing program:', error);
      return { program: null, provider: null, isWalletConnected: false };
    }
  }, [connection, wallet]);

  useEffect(() => {
    if (!isWalletConnected) {
      console.warn(
        'Wallet not connected. Please connect your wallet to continue.'
      );
    } else if (!program) {
      console.error(
        'Program failed to initialize even though wallet is connected.'
      );
    }
  }, [isWalletConnected, program]);

  return (
    <ProgramContext.Provider value={{ program, provider, isWalletConnected }}>
      {children}
    </ProgramContext.Provider>
  );
};

export const useProgram = () => {
  const context = useContext(ProgramContext);
  if (!context) {
    throw new Error('useProgram must be used within ProgramContextProvider');
  }
  return context;
};
