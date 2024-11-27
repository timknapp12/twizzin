import { Program } from '@coral-xyz/anchor';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { validateAuthority } from '../../config/constants';
import { TwizzinIdl } from '../../types/idl';

interface InitConfigResponse {
  success: boolean;
  signature: string | null;
  error: string | null;
}

export const initializeConfig = async (
  program: Program<TwizzinIdl>,
  wallet: WalletContextState,
  treasuryAddress: string,
  treasuryFee: string
): Promise<InitConfigResponse> => {
  try {
    if (!wallet.publicKey) throw new Error('Wallet not connected');
    if (!validateAuthority(wallet.publicKey))
      throw new Error('Must be connected with program authority wallet');
    if (!treasuryAddress || !treasuryFee)
      throw new Error('Treasury address and fee are required');

    const treasuryFeeBps = Math.floor(Number(treasuryFee) * 100);
    if (isNaN(treasuryFeeBps) || treasuryFeeBps > 1000 || treasuryFeeBps < 0) {
      throw new Error('Treasury fee must be between 0 and 10');
    }

    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      program.programId
    );

    try {
      await program.account.config.fetch(configPda);
      throw new Error('Config has already been initialized');
    } catch (e: any) {
      if (!e.toString().includes('Account does not exist')) {
        throw e;
      }
    }

    const method = program.methods.initConfig(
      new PublicKey(treasuryAddress),
      treasuryFeeBps
    ) as any;

    const tx = await method
      .accounts({
        admin: wallet.publicKey,
        config: configPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return { success: true, signature: tx, error: null };
  } catch (error) {
    console.error('Failed to initialize config:', error);
    return {
      success: false,
      signature: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};
