import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { TwizzinIdl } from '@/types/idl';
import { deriveGamePDAs } from './pdas';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { supabase } from '@/utils/supabase';

interface GameEndedEvent {
  game: PublicKey;
  totalPot: number;
  treasuryFee: number;
  adminCommission: number;
  endTime: number;
}

export const parseGameEndedEvent = (eventData: any): GameEndedEvent | null => {
  try {
    if (!eventData || !eventData.data) return null;

    return {
      game: eventData.data.game,
      totalPot: eventData.data.total_pot,
      treasuryFee: eventData.data.treasury_fee,
      adminCommission: eventData.data.admin_commission,
      endTime: eventData.data.end_time,
    };
  } catch (error) {
    console.error('Error parsing GameEnded event:', error);
    return null;
  }
};

export const endGame = async (
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
    isNative: boolean;
    vaultTokenAccount?: PublicKey;
    adminTokenAccount?: PublicKey;
    treasuryTokenAccount?: PublicKey;
  }
): Promise<{
  success: boolean;
  signature: string | null;
  error: string | null;
  endTime?: number;
}> => {
  try {
    const { gamePda, vaultPda, configPda } = deriveGamePDAs(
      program,
      admin,
      params.gameCode
    );

    // Fetch config to get treasury pubkey
    // @ts-ignore
    const config = await program.account.programConfig.fetch(configPda);

    // Create accounts object similar to joinGame
    const accounts = {
      admin,
      game: gamePda,
      vault: vaultPda,
      config: configPda,
      treasury: config.treasuryPubkey,
      vaultTokenAccount: params.isNative ? null : params.vaultTokenAccount,
      adminTokenAccount: params.isNative ? null : params.adminTokenAccount,
      treasuryTokenAccount: params.isNative
        ? null
        : params.treasuryTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: program.programId,
    };

    // Create the transaction
    const transaction = new Transaction();

    const instruction = await program.methods
      .endGame()
      // @ts-ignore
      .accounts(accounts)
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

    // Find the GameEnded event log
    const eventLog = txInfo.meta.logMessages.find((log) =>
      log.includes('GameEnded')
    );

    if (!eventLog) {
      throw new Error('GameEnded event not found in logs');
    }

    // Decode the event
    const rawEvent = program.coder.events.decode(eventLog);
    const event = parseGameEndedEvent(rawEvent);

    if (!event) {
      throw new Error('Failed to decode GameEnded event');
    }

    return {
      success: true,
      signature,
      error: null,
      endTime: event.endTime,
    };
  } catch (error: any) {
    console.error('Failed to end game:', error);
    return {
      success: false,
      signature: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

export const endGameCombined = async (
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
    isNative: boolean;
    vaultTokenAccount?: PublicKey;
    adminTokenAccount?: PublicKey;
    treasuryTokenAccount?: PublicKey;
  }
): Promise<{
  success: boolean;
  signature: string | null;
  error: string | null;
}> => {
  try {
    // 1. End game on Anchor
    const result = await endGame(program, connection, admin, sendTransaction, {
      gameCode: params.gameCode,
      isNative: params.isNative,
      vaultTokenAccount: params.vaultTokenAccount,
      adminTokenAccount: params.adminTokenAccount,
      treasuryTokenAccount: params.treasuryTokenAccount,
    });

    if (!result.success || !result.endTime) {
      throw new Error(result.error || 'Failed to end game on chain');
    }

    // 2. Convert timestamp to ISO string for Supabase
    const endTimeISO = new Date(result.endTime).toISOString();

    // 3. Update Supabase
    const { error: supabaseError } = await supabase
      .from('games')
      .update({
        status: 'ended',
        end_time: endTimeISO,
      })
      .eq('id', params.gameId);

    if (supabaseError) {
      throw new Error(`Failed to update Supabase: ${supabaseError.message}`);
    }

    return {
      success: true,
      signature: result.signature,
      error: null,
    };
  } catch (error: any) {
    console.error('Failed to end game:', error);
    return {
      success: false,
      signature: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};
