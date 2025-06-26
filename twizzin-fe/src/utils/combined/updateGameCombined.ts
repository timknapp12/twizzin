import { Program } from '@coral-xyz/anchor';
import { NATIVE_MINT } from '@solana/spl-token';
import { updateGame } from '../program/updateGame';
import { updateGameWithQuestions } from '../supabase/updateGameToDb';
import { UpdateGameCombinedParams } from '@/types';
import { TwizzinIdl } from '@/types/idl';
import { generateMerkleRoot } from '../merkle/generateMerkleRoot';
import { supabase } from '../supabase/supabaseClient';
import { getAnchorTimestamp, getSupabaseTimestamp } from '../helpers';
import { AnchorProvider } from '@coral-xyz/anchor';

export const updateGameCombined = async (
  program: Program<TwizzinIdl>,
  provider: AnchorProvider,
  params: UpdateGameCombinedParams
) => {
  const publicKey = provider.wallet.publicKey;
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
        entryFee: params.entryFee,
        commissionBps: params.commission,
        startTime: getSupabaseTimestamp(params.startTime),
        endTime: getSupabaseTimestamp(params.endTime),
        maxWinners: params.maxWinners,
        donationAmount: params.donationAmount ? params.donationAmount : 0,
        allAreWinners: params.allAreWinners || false,
        evenSplit: params.evenSplit || false,
        username: params.username,
      },
      params.questions,
      params.imageFile
    );
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

    const paramsForOnChain = {
      gameCode: params.gameCode,
      name: params.name,
      entryFee: params.entryFee,
      commission: params.commission,
      startTime,
      endTime,
      maxWinners: params.maxWinners,
      answerHash: merkleRootChanged ? answerHash : undefined,
      donationAmount: params.donationAmount || 0,
      allAreWinners: params.allAreWinners || false,
      evenSplit: params.evenSplit || false,
      tokenMint: params.tokenMint,
      isNative,
    };
    console.log('✅ On-chain parameters prepared');

    // 5. Update on-chain
    console.log('Step 5: Updating game on-chain...');
    const onChainResult = await updateGame(program, provider, paramsForOnChain);

    if (!onChainResult.success) {
      throw new Error(`Failed to update game on-chain: ${onChainResult.error}`);
    }
    console.log('✅ Game updated on-chain successfully');

    // 6. Update database with new merkle root if it changed
    if (merkleRootChanged) {
      console.log('Step 6: Updating database with merkle root...');
      await supabase
        .from('games')
        .update({
          answer_merkle_root: answerHash,
        })
        .eq('id', existingGame.id);
      console.log('✅ Database updated with merkle root');
    }

    console.log('🎉 Game update completed successfully!');
    return {
      onChain: onChainResult,
      database: dbResult,
    };
  } catch (err: unknown) {
    console.log('❌ Error updating game:', err);
    throw err;
  }
};
