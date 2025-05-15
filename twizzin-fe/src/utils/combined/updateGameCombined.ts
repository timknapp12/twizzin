import { Program } from '@coral-xyz/anchor';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import { updateGame } from '../program/updateGame';
import { updateGameWithQuestions } from '../supabase/updateGameToDb';
import { UpdateGameCombinedParams } from '@/types';
import { TwizzinIdl } from '@/types/idl';
import { generateMerkleRoot } from '../merkle/generateMerkleRoot';
import { supabase } from '../supabase/supabaseClient';
import { getAnchorTimestamp, getSupabaseTimestamp } from '../helpers';

type VerificationFunction = <T>(operation: () => Promise<T>, errorMessage?: string) => Promise<T | null>;

type UpdateGameData = {
  name: string;
  entry_fee: number;
  commission_bps: number;
  start_time: string;
  end_time: string;
  max_winners: number;
  donation_amount: number;
  all_are_winners: boolean;
  even_split: boolean;
  username?: string;
  img_url?: string;
};

export const updateGameCombined = async (
  program: Program<TwizzinIdl>,
  connection: Connection,
  publicKey: PublicKey,
  sendTransaction: (
    // eslint-disable-next-line no-unused-vars
    transaction: Transaction,
    // eslint-disable-next-line no-unused-vars
    connection: Connection
  ) => Promise<string>,
  params: UpdateGameCombinedParams,
  withVerification: VerificationFunction
) => {
  if (!publicKey) throw new Error('Wallet not connected');
  console.log('Starting game update process...');

  const isNative = params.tokenMint.equals(NATIVE_MINT);

  try {
    // 1. First fetch existing game data
    console.log('Step 1: Fetching current game data...');
    const { data: existingGame, error: fetchError } = await supabase
      .from('games')
      .select('id, game_code, answer_merkle_root')
      .eq('game_code', params.gameCode)
      .single();

    if (fetchError || !existingGame) {
      throw new Error(
        `Game not found: ${fetchError?.message || 'Unknown error'}`
      );
    }
    console.log('✅ Retrieved existing game data');

    // 2. Update database first
    console.log('Step 2: Updating database entries...');
    const dbResult = await updateGameWithQuestions(
      existingGame.id,
      {
        name: params.name,
        entry_fee: params.entryFee,
        commission_bps: params.commission,
        start_time: getSupabaseTimestamp(params.startTime),
        end_time: getSupabaseTimestamp(params.endTime),
        max_winners: params.maxWinners,
        donation_amount: params.donationAmount ? params.donationAmount : 0,
        all_are_winners: params.allAreWinners || false,
        even_split: params.evenSplit || false,
        username: params.username,
      },
      params.questions,
      params.imageFile,
      withVerification
    );

    if (!dbResult) {
      throw new Error('Failed to update game in database');
    }

    console.log('✅ Database entries updated successfully');

    // 3. Generate merkle root AFTER database update
    console.log('Step 3: Generating new merkle root...');
    const answerHash = await generateMerkleRoot(dbResult.questions);
    const merkleRootChanged = answerHash !== existingGame.answer_merkle_root;
    console.log('✅ Merkle root generated successfully');

    // 4. Prepare on-chain parameters
    console.log('Step 4: Preparing on-chain parameters...');
    const addOneYear = 31536000000;
    const startTime = getAnchorTimestamp(params.startTime) + addOneYear;
    const endTime = getAnchorTimestamp(params.endTime) + addOneYear;

    // 5. Update on-chain if merkle root changed
    let onChainResult = null;
    if (merkleRootChanged) {
      console.log('Step 5: Updating game on-chain...');
      onChainResult = await updateGame(
        program,
        connection,
        publicKey,
        sendTransaction,
        {
          gameCode: params.gameCode,
          answerHash,
          startTime,
          endTime,
          tokenMint: params.tokenMint,
          isNative,
        }
      );

      if (!onChainResult.success) {
        throw new Error(
          `Failed to update game on-chain: ${onChainResult.error}`
        );
      }
      console.log('✅ Game updated on-chain successfully');

      // 6. Update database with new merkle root
      console.log('Step 6: Updating database with new merkle root...');
      await supabase
        .from('games')
        .update({
          answer_merkle_root: answerHash,
        })
        .eq('id', existingGame.id);
      console.log('✅ Database updated with new merkle root');
    } else {
      console.log('Skipping on-chain update as merkle root is unchanged');
    }

    console.log('🎉 Game update completed successfully!');
    return {
      onChain: {
        success: true,
        signature: onChainResult?.signature || null,
        error: onChainResult?.error || null,
      },
      database: {
        game: dbResult.game,
        questions: dbResult.questions,
        answers: dbResult.answers,
      },
    };
  } catch (err: unknown) {
    console.error('Failed to update game:', err);
    throw err;
  }
};
