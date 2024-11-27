import { PublicKey, SystemProgram } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { validateAuthority } from '../../config/constants';

interface WalletInterface {
  publicKey: PublicKey | null;
}

interface InitConfigResponse {
  success: boolean;
  signature: string | null;
  error: string | null;
}

export const initializeConfig = async (
  program: Program,
  wallet: WalletInterface,
  treasuryAddress: string,
  treasuryFee: string
): Promise<InitConfigResponse> => {
  try {
    if (!wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    // Validate connected wallet is program authority
    if (!validateAuthority(wallet.publicKey)) {
      throw new Error('Must be connected with program authority wallet');
    }

    // Validate inputs
    if (!treasuryAddress || !treasuryFee) {
      throw new Error('Treasury address and fee are required');
    }

    const treasuryFeeNumber = Number(treasuryFee);
    if (
      isNaN(treasuryFeeNumber) ||
      treasuryFeeNumber > 10 ||
      treasuryFeeNumber < 0
    ) {
      throw new Error('Treasury fee must be between 0 and 10');
    }

    // Convert fee percentage to basis points (multiply by 100)
    const treasuryFeeBps = Math.floor(treasuryFeeNumber * 100);

    // Derive config PDA
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      program.programId
    );

    // Send transaction
    const tx = await program.methods
      .initConfig(new PublicKey(treasuryAddress), treasuryFeeBps)
      .accounts({
        admin: wallet.publicKey,
        config: configPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return {
      success: true,
      signature: tx,
      error: null,
    };
  } catch (error) {
    console.error('Failed to initialize config:', error);
    return {
      success: false,
      signature: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};
