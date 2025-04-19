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
    gameId: string;
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

    // Wait for confirmation and processing
    const latestBlockhash = await connection.getLatestBlockhash();
    const confirmation = await connection.confirmTransaction({
      signature,
      ...latestBlockhash,
    });

    if (confirmation.value.err) {
      throw new Error(
        'Transaction failed: ' + JSON.stringify(confirmation.value.err)
      );
    }

    // Fetch the game account state directly
    // @ts-ignore
    const gameState = await program.account.game.fetch(gamePda);

    const result = {
      success: true,
      signature,
      error: null,
      startTime: gameState.startTime.toNumber(),
      endTime: gameState.endTime.toNumber(),
    };

    if (!result.success || !result.startTime || !result.endTime) {
      throw new Error(result.error || 'Failed to start game on chain');
    }

    // Verify timestamps are current (not one year ahead)
    const currentTime = Date.now();
    const maxTimeDiff = 5000; // Allow 5 seconds difference for processing time

    if (Math.abs(result.startTime - currentTime) > maxTimeDiff) {
      console.error('Invalid start time received from program:', {
        programStartTime: result.startTime,
        currentTime,
        difference: result.startTime - currentTime,
      });
      console.warn('Received invalid start time from program');
    }

    if (
      Math.abs(result.endTime - (currentTime + params.totalTimeMs)) >
      maxTimeDiff
    ) {
      console.error('Invalid end time received from program:', {
        programEndTime: result.endTime,
        expectedEndTime: currentTime + params.totalTimeMs,
        difference: result.endTime - (currentTime + params.totalTimeMs),
      });
      console.warn('Received invalid end time from program');
    }

    console.log('Program timestamps:', {
      startTime: result.startTime,
      endTime: result.endTime,
      startTimeDate: new Date(result.startTime),
      endTimeDate: new Date(result.endTime),
    });

    // 2. Convert timestamps to ISO strings for Supabase
    const startTimeISO = new Date(result.startTime).toISOString();
    const endTimeISO = new Date(result.endTime).toISOString();

    console.log('Database timestamps:', {
      startTimeISO,
      endTimeISO,
    });

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
        gameId: params.gameId,
      }
    );

    if (!result.success || !result.startTime || !result.endTime) {
      throw new Error(result.error || 'Failed to start game on chain');
    }

    // Verify timestamps are current (not one year ahead)
    const currentTime = Date.now();
    const maxTimeDiff = 5000; // Allow 5 seconds difference for processing time

    if (Math.abs(result.startTime - currentTime) > maxTimeDiff) {
      console.error('Invalid start time received from program:', {
        programStartTime: result.startTime,
        currentTime,
        difference: result.startTime - currentTime,
      });
      console.warn('Received invalid start time from program');
    }

    if (
      Math.abs(result.endTime - (currentTime + params.totalTimeMs)) >
      maxTimeDiff
    ) {
      console.error('Invalid end time received from program:', {
        programEndTime: result.endTime,
        expectedEndTime: currentTime + params.totalTimeMs,
        difference: result.endTime - (currentTime + params.totalTimeMs),
      });
      console.warn('Received invalid end time from program');
    }

    console.log('Program timestamps:', {
      startTime: result.startTime,
      endTime: result.endTime,
      startTimeDate: new Date(result.startTime),
      endTimeDate: new Date(result.endTime),
    });

    // 2. Convert timestamps to ISO strings for Supabase
    const startTimeISO = new Date(result.startTime).toISOString();
    const endTimeISO = new Date(result.endTime).toISOString();

    console.log('Database timestamps:', {
      startTimeISO,
      endTimeISO,
    });

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
