import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';
import { TwizzinIdl } from '@/types/idl';
import { StartGameResult } from '@/types';
import { deriveGamePDAs } from './pdas';
import { supabase } from '@/utils/supabase';

export const startGame = async (
  program: Program<TwizzinIdl>,
  connection: Connection,
  admin: PublicKey,
  sendTransaction: (
    // eslint-disable-next-line no-unused-vars
    transaction: Transaction,
    // eslint-disable-next-line no-unused-vars
    connection: Connection
  ) => Promise<string>,
  params: {
    gameCode: string;
    totalTimeMs: number;
  }
): Promise<{
  success: boolean;
  signature: string | null;
  error: string | null;
  startTime?: number;
  endTime?: number;
}> => {
  try {
    const { gamePda } = deriveGamePDAs(program, admin, params.gameCode);
    const totalTimeMsBN = new BN(params.totalTimeMs);

    const transaction = new Transaction();
    const instruction = await program.methods
      .startGame(totalTimeMsBN)
      .accounts({
        admin,
        game: gamePda,
      })
      .instruction();

    transaction.add(instruction);
    const signature = await sendTransaction(transaction, connection);

    // Wait for confirmation
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      ...latestBlockhash,
    });

    // Fetch the game account state directly
    // @ts-ignore
    const gameState = await program.account.game.fetch(gamePda);

    return {
      success: true,
      signature,
      error: null,
      startTime: gameState.startTime.toNumber(),
      endTime: gameState.endTime.toNumber(),
    };
  } catch (error: any) {
    console.error('Failed to start game:', error);
    return {
      success: false,
      signature: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

export const startGameCombined = async (
  program: Program<TwizzinIdl>,
  connection: Connection,
  admin: PublicKey,
  sendTransaction: (
    // eslint-disable-next-line no-unused-vars
    transaction: Transaction,
    // eslint-disable-next-line no-unused-vars
    connection: Connection
  ) => Promise<string>,
  params: {
    gameId: string;
    gameCode: string;
    totalTimeMs: number;
  }
): Promise<StartGameResult> => {
  try {
    // 1. Start game on Anchor
    // the anchor program will mark the start time as the current time when the program ix is called
    const result = await startGame(
      program,
      connection,
      admin,
      sendTransaction,
      {
        gameCode: params.gameCode,
        totalTimeMs: params.totalTimeMs,
      }
    );

    if (!result.success || !result.startTime || !result.endTime) {
      throw new Error(result.error || 'Failed to start game on chain');
    }

    // 2. Convert timestamps to ISO strings for Supabase
    const startTimeISO = new Date(result.startTime).toISOString();
    const endTimeISO = new Date(result.endTime).toISOString();

    // 3. Update Supabase
    const { error: supabaseError } = await supabase
      .from('games')
      .update({
        start_time: startTimeISO,
        end_time: endTimeISO,
        status: 'active',
      })
      .eq('id', params.gameId);

    if (supabaseError) {
      throw new Error(`Failed to update Supabase: ${supabaseError.message}`);
    }

    return result;
  } catch (error: any) {
    console.error('Failed to start game:', error);
    return {
      success: false,
      signature: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};
