import { Program } from '@coral-xyz/anchor';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import { initializeGame } from '../program/initGame';
import { createGameWithQuestions } from '../supabase/createGame';
import { CreateFullGameParams } from '@/types';
import { TwizzinIdl } from '@/types/idl';
import { generateMerkleRoot } from '../merkle/generateMerkleRoot';
import { supabase } from '../supabase/supabaseClient';

export const createFullGame = async (
  program: Program<TwizzinIdl>,
  wallet: WalletContextState,
  params: CreateFullGameParams
) => {
  if (!wallet.publicKey) throw new Error('Wallet not connected');
  console.log('Starting game creation process...');

  const isNative = params.tokenMint.equals(NATIVE_MINT);

  try {
    // 1. First create database entries
    console.log('Step 1: Creating database entries...');
    const dbResult = await createGameWithQuestions(
      {
        gamePubkey: '',
        adminWallet: wallet.publicKey.toString(),
        name: params.name,
        tokenMint: params.tokenMint.toString(),
        entryFee: params.entryFee * LAMPORTS_PER_SOL,
        commissionBps: params.commission,
        startTime: params.startTime,
        endTime: params.endTime,
        maxWinners: params.maxWinners,
        donationAmount: params.donationAmount
          ? params.donationAmount * LAMPORTS_PER_SOL
          : 0,
        isNative: isNative,
        allAreWinners: params.allAreWinners || false,
        evenSplit: params.evenSplit || false,
        answerMerkleRoot: '',
        imgUrl: '',
      },
      params.questions,
      params.imageFile
    );
    console.log('✅ Database entries created successfully');

    // 2. Generate merkle root
    console.log('Step 2: Generating merkle root...');
    const answerHash = await generateMerkleRoot(dbResult.questions);
    console.log('✅ Merkle root generated successfully');

    // 3. Get game code and prepare timestamps
    console.log('Step 3: Preparing on-chain parameters...');
    const gameCode = dbResult.game.game_code;
    const startTime = Math.floor(params.startTime.getTime() / 1000);
    const endTime = Math.floor(params.endTime.getTime() / 1000);

    const paramsForOnChain = {
      ...params,
      gameCode,
      answerHash,
      startTime,
      endTime,
    };
    console.log('✅ On-chain parameters prepared');

    // 4. Initialize on-chain
    console.log('Step 4: Initializing game on-chain...');
    const onChainResult = await initializeGame(
      program,
      wallet,
      paramsForOnChain
    );

    if (!onChainResult.success) {
      throw new Error(
        `Failed to initialize game on-chain: ${onChainResult.error}`
      );
    }
    console.log('✅ Game initialized on-chain successfully');

    // 5. Update database with on-chain info
    console.log('Step 5: Updating database with on-chain information...');
    await supabase
      .from('games')
      .update({
        game_pubkey: onChainResult.signature,
        answer_merkle_root: answerHash,
      })
      .eq('id', dbResult.game.id);
    console.log('✅ Database updated with on-chain information');

    console.log('🎉 Game creation completed successfully!');
    return {
      onChain: onChainResult,
      database: dbResult,
    };
  } catch (error) {
    console.error('❌ Error creating game:', error);
    throw error;
  }
};
