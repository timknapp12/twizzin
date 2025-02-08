import {
  TransactionInstruction,
  Transaction,
  PublicKey,
  SystemProgram,
  Connection,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { BN, Program } from '@coral-xyz/anchor';
import { TwizzinIdl } from '../../types/idl';
import { deriveGamePDAs } from './pdas';

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
  connection: Connection,
  publicKey: PublicKey,
  sendTransaction: (
    // eslint-disable-next-line no-unused-vars
    transaction: Transaction,
    // eslint-disable-next-line no-unused-vars
    connection: Connection
  ) => Promise<string>,
  params: InitGameParams
): Promise<{
  success: boolean;
  signature: string | null;
  error: string | null;
}> => {
  try {
    if (!publicKey) throw new Error('Wallet not connected');

    validateGameParams(params);
    const isNative = params.tokenMint.equals(NATIVE_MINT);

    const { gamePda, vaultPda } = deriveGamePDAs(
      program,
      publicKey,
      params.gameCode
    );
    const preInstructions: TransactionInstruction[] = [];
    let vaultTokenAccount: PublicKey | null = null;

    if (!isNative) {
      vaultTokenAccount = await getAssociatedTokenAddress(
        params.tokenMint,
        vaultPda,
        true
      );

      preInstructions.push(
        createAssociatedTokenAccountInstruction(
          publicKey,
          vaultTokenAccount,
          vaultPda,
          params.tokenMint
        )
      );
    }

    if (isNative && params.donationAmount && params.donationAmount > 0) {
      const rentExemption = await connection.getMinimumBalanceForRentExemption(
        0
      );
      preInstructions.push(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: vaultPda,
          lamports: rentExemption,
        })
      );
    }

    const instruction = await program.methods
      .initGame(
        params.name,
        params.gameCode,
        new BN(params.entryFee),
        params.commission,
        new BN(params.startTime),
        new BN(params.endTime),
        params.maxWinners,
        params.answerHash,
        params.donationAmount ? new BN(params.donationAmount) : new BN(0),
        params.allAreWinners || false,
        params.evenSplit || false
      )
      .accounts({
        admin: publicKey,
        game: gamePda,
        tokenMint: params.tokenMint,
        vault: vaultPda,
        vaultTokenAccount: vaultTokenAccount,
        adminTokenAccount: isNative ? null : params.adminTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      } as any)
      .instruction();

    const transaction = new Transaction();

    // Add all instructions
    transaction.add(...preInstructions, instruction);

    const signature = await sendTransaction(transaction, connection);

    // Wait for confirmation
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      ...latestBlockhash,
    });

    return { success: true, signature, error: null };
  } catch (error: any) {
    console.error('Failed to initialize game:', error);
    return {
      success: false,
      signature: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

const validateGameParams = (params: InitGameParams): void => {
  if (params.name.length > 32) throw new Error('Name too long');
  if (params.maxWinners < 1) throw new Error('Max winners too low');
  if (params.maxWinners > 200) throw new Error('Max winners too high');
  if (params.startTime >= params.endTime) throw new Error('Invalid time range');
};
