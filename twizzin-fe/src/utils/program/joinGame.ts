import {
  Transaction,
  PublicKey,
  SystemProgram,
  Connection,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  NATIVE_MINT,
} from '@solana/spl-token';
import { Program } from '@coral-xyz/anchor';
import { TwizzinIdl } from '../../types/idl';
import { deriveGamePDAs, derivePlayerPDA } from './pdas';
import { JoinGameParams } from '@/types';

export const joinGame = async (
  program: Program<TwizzinIdl>,
  connection: Connection,
  publicKey: PublicKey,
  sendTransaction: (
    // eslint-disable-next-line no-unused-vars
    transaction: Transaction,
    // eslint-disable-next-line no-unused-vars
    connection: Connection
  ) => Promise<string>,
  params: JoinGameParams
): Promise<{
  success: boolean;
  signature: string | null;
  error: string | null;
}> => {
  try {
    if (!publicKey) throw new Error('Wallet not connected');

    // 1. Derive PDAs and log them
    const { gamePda, vaultPda } = deriveGamePDAs(
      program,
      params.admin,
      params.gameCode
    );
    const playerPda = derivePlayerPDA(program, gamePda, publicKey);
    const isNative = params.tokenMint.equals(NATIVE_MINT);

    // 2. Create transaction and get blockhash first
    const transaction = new Transaction();
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = publicKey;

    // 3. If native SOL with entry fee, add transfer instruction
    if (isNative && params.entryFee > 0) {
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: vaultPda,
        lamports: params.entryFee,
      });
      transaction.add(transferInstruction);
    }

    // 4. Create all accounts object and log it
    const accounts = {
      player: publicKey,
      game: gamePda,
      playerAccount: playerPda,
      vault: vaultPda,
      vaultTokenAccount: isNative ? null : params.vaultTokenAccount,
      playerTokenAccount: isNative ? null : params.playerTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    };
    const instruction = await program.methods
      .joinGame()
      // @ts-ignore
      .accounts(accounts)
      .instruction();

    transaction.add(instruction);

    const signature = await sendTransaction(transaction, connection);

    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });

    return { success: true, signature, error: null };
  } catch (error: any) {
    console.error('Failed to join game:', error);

    let errorMessage = 'Unknown error occurred';
    const errorDetails = {
      message: error.message,
      logs: error.logs,
      details: error.details,
    };
    console.error('Error details:', errorDetails);

    if (error.message) {
      if (error.message.includes('0x1')) {
        errorMessage = 'Insufficient funds for transaction';
      } else if (error.message.includes('0x0')) {
        errorMessage = 'Player has already joined this game';
      } else if (error.message.includes('simulation failed')) {
        errorMessage = `Simulation failed: ${error.message}`;
      } else {
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      signature: null,
      error: errorMessage,
    };
  }
};
