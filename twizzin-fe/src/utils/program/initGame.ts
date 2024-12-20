import { Program } from '@coral-xyz/anchor';
import { WalletContextState } from '@solana/wallet-adapter-react';
import {
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  NATIVE_MINT,
} from '@solana/spl-token';
import { TwizzinIdl } from '../../types/idl';
import { BN } from '@coral-xyz/anchor';

interface InitGameResponse {
  success: boolean;
  signature: string | null;
  error: string | null;
}

interface InitGameParams {
  name: string;
  gameCode: string;
  entryFee: number;
  commission: number;
  startTime: number;
  endTime: number;
  maxWinners: number;
  answerHash: number[];
  tokenMint: PublicKey;
  donationAmount?: number;
  allAreWinners?: boolean;
  evenSplit?: boolean;
  adminTokenAccount?: PublicKey;
}

export const initializeGame = async (
  program: Program<TwizzinIdl>,
  wallet: WalletContextState,
  params: InitGameParams
): Promise<InitGameResponse> => {
  try {
    if (!wallet.publicKey) throw new Error('Wallet not connected');

    // Validate parameters
    if (params.name.length > 32) throw new Error('Name too long');
    if (params.maxWinners < 1) throw new Error('Max winners too low');
    if (params.maxWinners > 200) throw new Error('Max winners too high');
    if (params.startTime >= params.endTime)
      throw new Error('Invalid time range');

    const isNative = params.tokenMint.equals(NATIVE_MINT);

    // Derive PDAs
    const [gamePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('game'),
        wallet.publicKey.toBuffer(),
        Buffer.from(params.gameCode),
      ],
      program.programId
    );

    const [vaultPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'),
        wallet.publicKey.toBuffer(),
        Buffer.from(params.gameCode),
      ],
      program.programId
    );

    let preInstructions: TransactionInstruction[] = [];
    let vaultTokenAccount: PublicKey | null = null;

    // Handle SPL token setup
    if (!isNative) {
      vaultTokenAccount = await getAssociatedTokenAddress(
        params.tokenMint,
        vaultPda,
        true
      );

      preInstructions.push(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          vaultTokenAccount,
          vaultPda,
          params.tokenMint
        )
      );
    }

    // If there's a donation, add rent exemption for native SOL
    if (isNative && params.donationAmount && params.donationAmount > 0) {
      const rentExemption =
        await program.provider.connection.getMinimumBalanceForRentExemption(0);
      preInstructions.push(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: vaultPda,
          lamports: rentExemption,
        })
      );
    }

    let tx;
    if (isNative) {
      tx = await program.methods
        .initGame(
          params.name,
          params.gameCode,
          new BN(params.entryFee * LAMPORTS_PER_SOL),
          params.commission,
          new BN(params.startTime),
          new BN(params.endTime),
          params.maxWinners,
          params.answerHash,
          new BN((params.donationAmount || 0) * LAMPORTS_PER_SOL),
          params.allAreWinners || false,
          params.evenSplit || false
        )
        .accounts({
          admin: wallet.publicKey,
          game: gamePda,
          token_mint: params.tokenMint,
          vault: vaultPda,
          vault_token_account: undefined as any,
          admin_token_account: undefined as any,
          token_program: TOKEN_PROGRAM_ID,
          associated_token_program: ASSOCIATED_TOKEN_PROGRAM_ID,
          system_program: SystemProgram.programId,
        })
        .preInstructions(preInstructions)
        .rpc();
    } else {
      // SPL token case
      if (!vaultTokenAccount)
        throw new Error('Vault token account is required for SPL tokens');

      tx = await program.methods
        .initGame(
          params.name,
          params.gameCode,
          new BN(params.entryFee * LAMPORTS_PER_SOL),
          params.commission,
          new BN(params.startTime),
          new BN(params.endTime),
          params.maxWinners,
          params.answerHash,
          new BN((params.donationAmount || 0) * LAMPORTS_PER_SOL),
          params.allAreWinners || false,
          params.evenSplit || false
        )
        .accounts({
          admin: wallet.publicKey,
          game: gamePda,
          token_mint: params.tokenMint,
          vault: vaultPda,
          vault_token_account: vaultTokenAccount as any,
          admin_token_account: params.adminTokenAccount as any,
          token_program: TOKEN_PROGRAM_ID,
          associated_token_program: ASSOCIATED_TOKEN_PROGRAM_ID,
          system_program: SystemProgram.programId,
        })
        .preInstructions(preInstructions)
        .rpc();
    }

    return { success: true, signature: tx, error: null };
  } catch (error) {
    console.error('Failed to initialize game:', error);
    return {
      success: false,
      signature: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};
