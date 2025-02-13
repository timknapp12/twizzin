import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';
import { TwizzinIdl } from '@/types/idl';
import { StartGameResult, GameStartedEvent } from '@/types';
import { deriveGamePDAs } from './pdas';
import { SupabaseClient } from '@supabase/supabase-js';

export const parseGameStartedEvent = (
  eventData: any
): GameStartedEvent | null => {
  try {
    if (!eventData || !eventData.data) return null;

    return {
      admin: eventData.data.admin,
      game: eventData.data.game,
      startTime: eventData.data.startTime,
      endTime: eventData.data.endTime,
    };
  } catch (error) {
    console.error('Error parsing GameStarted event:', error);
    return null;
  }
};

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

    // Convert totalTimeMs to BN
    const totalTimeMsBN = new BN(params.totalTimeMs);

    // Create the transaction - note the separation of the argument and accounts
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

    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      ...latestBlockhash,
    });

    const txInfo = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!txInfo?.meta?.logMessages) {
      throw new Error('Transaction info not found');
    }

    // Find the GameStarted event log
    const eventLog = txInfo.meta.logMessages.find((log) =>
      log.includes('GameStarted')
    );

    if (!eventLog) {
      throw new Error('GameStarted event not found in logs');
    }

    // Decode the event
    const rawEvent = program.coder.events.decode(eventLog);
    const event = parseGameStartedEvent(rawEvent);

    if (!event) {
      throw new Error('Failed to decode GameStarted event');
    }

    return {
      success: true,
      signature,
      error: null,
      startTime: event.startTime.toNumber(),
      endTime: event.endTime.toNumber(),
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
  supabase: SupabaseClient,
  params: {
    gameId: string;
    gameCode: string;
    totalTimeMs: number;
  }
): Promise<StartGameResult> => {
  try {
    // 1. Start game on Anchor
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
