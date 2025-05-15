import {
  Transaction,
  PublicKey,
  SystemProgram,
  Connection,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { BN, Program } from '@coral-xyz/anchor';
import { TwizzinIdl } from '@/types/idl';
import { deriveGamePDAs } from './pdas';

interface UpdateGameParams {
  gameCode: string;
  name?: string;
  entryFee?: number;
  commission?: number;
  startTime?: number;
  endTime?: number;
  maxWinners?: number;
  answerHash?: number[];
  donationAmount?: number;
  allAreWinners?: boolean;
  evenSplit?: boolean;
  tokenMint: PublicKey;
  isNative: boolean;
}

export const updateGame = async (
  program: Program<TwizzinIdl>,
  connection: Connection,
  publicKey: PublicKey,
  sendTransaction: (
    // eslint-disable-next-line no-unused-vars
    transaction: Transaction,
    // eslint-disable-next-line no-unused-vars
    connection: Connection,
    // eslint-disable-next-line no-unused-vars
    options?: { skipPreflight: boolean }
  ) => Promise<string>,
  params: UpdateGameParams
): Promise<{
  success: boolean;
  signature: string | null;
  error: string | null;
}> => {
  try {
    const { gamePda, vaultPda } = deriveGamePDAs(
      program,
      publicKey,
      params.gameCode
    );

    // Convert numeric values to BN format
    const entryFeeBN =
      params.entryFee !== undefined ? new BN(params.entryFee) : null;
    const donationAmountBN =
      params.donationAmount !== undefined
        ? new BN(params.donationAmount)
        : null;

    // Convert timestamps to BN
    const startTimeBN =
      params.startTime !== undefined ? new BN(params.startTime) : null;
    const endTimeBN =
      params.endTime !== undefined ? new BN(params.endTime) : null;

    // Format answer hash as fixed-size array
    let formattedAnswerHash = null;
    if (params.answerHash) {
      formattedAnswerHash = Array(32).fill(0);
      for (let i = 0; i < Math.min(params.answerHash.length, 32); i++) {
        formattedAnswerHash[i] = params.answerHash[i];
      }
    }

    // Get the program method
    const method = program.methods.updateGame(
      params.name !== undefined ? params.name : null,
      entryFeeBN,
      params.commission !== undefined ? params.commission : null,
      startTimeBN,
      endTimeBN,
      params.maxWinners !== undefined ? params.maxWinners : null,
      formattedAnswerHash,
      donationAmountBN,
      params.allAreWinners !== undefined ? params.allAreWinners : null,
      params.evenSplit !== undefined ? params.evenSplit : null
    );

    // For native SOL we need to provide the accounts explicitly
    if (params.isNative) {
      // Native SOL doesn't use token accounts
      const instruction = await method
        .accounts({
          admin: publicKey,
          game: gamePda,
          vault: vaultPda,
          vaultTokenAccount: null,
          tokenMint: params.tokenMint,
          adminTokenAccount: null,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .instruction();

      const transaction = new Transaction();

      // Add compute budget instruction
      const computeBudgetInstruction = ComputeBudgetProgram.setComputeUnitLimit(
        {
          units: 1_400_000, // Maximum compute units for safety
        }
      );
      transaction.add(computeBudgetInstruction);
      transaction.add(instruction);

      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: true,
      });

      // Wait for confirmation
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature,
        ...latestBlockhash,
      });

      return { success: true, signature, error: null };
    } else {
      // For SPL tokens, get the associated token accounts
      const vaultTokenAccount = await getAssociatedTokenAddress(
        params.tokenMint,
        vaultPda,
        true
      );

      const adminTokenAccount = await getAssociatedTokenAddress(
        params.tokenMint,
        publicKey
      );

      // Create the instruction with token accounts
      const instruction = await method
        .accounts({
          admin: publicKey,
          game: gamePda,
          vault: vaultPda,
          vaultTokenAccount, // No null here
          tokenMint: params.tokenMint,
          adminTokenAccount, // No null here
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const transaction = new Transaction();

      // Add compute budget instruction
      const computeBudgetInstruction = ComputeBudgetProgram.setComputeUnitLimit(
        {
          units: 1_400_000, // Maximum compute units for safety
        }
      );
      transaction.add(computeBudgetInstruction);
      transaction.add(instruction);

      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: true,
      });

      // Wait for confirmation
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature,
        ...latestBlockhash,
      });

      return { success: true, signature, error: null };
    }
  } catch (error: any) {
    console.error('Failed to update game:', error);
    return {
      success: false,
      signature: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};
