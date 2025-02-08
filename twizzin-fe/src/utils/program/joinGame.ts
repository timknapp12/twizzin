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

    const { gamePda, vaultPda } = deriveGamePDAs(
      program,
      params.admin,
      params.gameCode
    );

    const playerPda = derivePlayerPDA(program, gamePda, publicKey);
    const isNative = params.tokenMint.equals(NATIVE_MINT);

    const transaction = new Transaction();

    // If it's a native SOL game with entry fee, add the transfer instruction
    if (isNative && params.entryFee > 0) {
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: vaultPda,
        lamports: params.entryFee,
      });
      transaction.add(transferInstruction);
    }

    const instruction = await program.methods
      .joinGame()
      .accounts({
        player: publicKey,
        game: gamePda,
        playerAccount: playerPda,
        vault: vaultPda,
        vaultTokenAccount: isNative ? null : params.vaultTokenAccount,
        playerTokenAccount: isNative ? null : params.playerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      } as any)
      .instruction();

    // Add the join game instruction
    transaction.add(instruction);

    const signature = await sendTransaction(transaction, connection);

    // Wait for confirmation
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      ...latestBlockhash,
    });

    return { success: true, signature, error: null };
  } catch (error: any) {
    console.error('Failed to join game:', error);
    return {
      success: false,
      signature: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};
