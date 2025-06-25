import {
  Transaction,
  SystemProgram,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { Program, BN, AnchorProvider } from '@coral-xyz/anchor';
import { TwizzinIdl } from '@/types/idl';
import { deriveGamePDAs, derivePlayerPDA } from './pdas';
import { SubmitAnswersParams } from '@/types';

export const submitAnswers = async (
  program: Program<TwizzinIdl>,
  provider: AnchorProvider,
  params: SubmitAnswersParams
): Promise<{
  success: boolean;
  signature: string | null;
  error: string | null;
}> => {
  try {
    const publicKey = provider.wallet.publicKey;
    if (!publicKey) throw new Error('Wallet not connected');

    console.log('Starting submitAnswers with params:', {
      gameCode: params.gameCode,
      admin: params.admin.toString(),
      answersCount: params.answers.length,
      clientFinishTime: params.clientFinishTime,
    });

    // 1. Derive PDAs
    const { gamePda } = deriveGamePDAs(program, params.admin, params.gameCode);
    const playerPda = derivePlayerPDA(program, gamePda, publicKey);
    console.log('Derived PDAs:', {
      gamePda: gamePda.toString(),
      playerPda: playerPda.toString(),
    });

    // 2. Create transaction and get blockhash
    const transaction = new Transaction();
    const { blockhash, lastValidBlockHeight } =
      await provider.connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = publicKey;

    // Add compute budget instruction to increase CU limit
    const computeBudgetInstruction = ComputeBudgetProgram.setComputeUnitLimit({
      units: 1_400_000,
    });
    transaction.add(computeBudgetInstruction);

    // 3. Create instruction for submitting answers
    const accounts = {
      player: publicKey,
      game: gamePda,
      playerAccount: playerPda,
      systemProgram: SystemProgram.programId,
    };

    console.log('Creating instruction with accounts:', {
      player: accounts.player.toString(),
      game: accounts.game.toString(),
      playerAccount: accounts.playerAccount.toString(),
    });

    const instruction = await program.methods
      .submitAnswers(
        params.answers.map((a) => ({
          displayOrder: a.displayOrder,
          answer: a.answer,
          questionId: a.questionId,
          proof: a.proof,
        })),
        new BN(params.clientFinishTime)
      )
      .accounts(accounts)
      .instruction();

    transaction.add(instruction);

    // 4. Send and confirm transaction
    console.log('Sending transaction with skip preflight...');
    const signature = await provider.sendAndConfirm(transaction);

    console.log('Transaction sent, waiting for confirmation...');
    await provider.connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });

    console.log('Transaction confirmed successfully');
    return { success: true, signature, error: null };
  } catch (error: any) {
    console.error('Failed to submit answers:', error);

    console.error('Error details:', {
      message: error.message,
      logs: error.logs,
      details: error.details,
      stack: error.stack,
    });

    // Extract error message from program error if available
    let errorMessage = error.message;
    if (error.logs) {
      const programErrorLog = error.logs.find((log: string) =>
        log.includes('Program log: Error:')
      );
      if (programErrorLog) {
        errorMessage = programErrorLog.split('Error:')[1].trim();
      }
    }

    return {
      success: false,
      signature: null,
      error: errorMessage,
    };
  }
};
