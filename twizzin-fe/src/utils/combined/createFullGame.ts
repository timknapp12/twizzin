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

  const isNative = params.tokenMint.equals(NATIVE_MINT);

  // 1. First create database entries
  const dbResult = await createGameWithQuestions(
    {
      gamePubkey: '', // Will update after on-chain creation
      adminWallet: wallet.publicKey.toString(),
      name: params.name,
      tokenMint: params.tokenMint.toString(),
      entryFee: params.entryFee * LAMPORTS_PER_SOL,
      commissionBps: params.commission,
      startTime: new Date(params.startTime * 1000),
      endTime: new Date(params.endTime * 1000),
      maxWinners: params.maxWinners,
      donationAmount: params.donationAmount
        ? params.donationAmount * LAMPORTS_PER_SOL
        : 0,
      isNative: isNative,
      allAreWinners: params.allAreWinners || false,
      evenSplit: params.evenSplit || false,
      answerMerkleRoot: '', // Will update after generating merkle root
      imgUrl: '', // Will be set by createGameWithQuestions if imageFile is provided
    },
    params.questions,
    params.imageFile
  );

  // 2. Generate merkle root from the created questions/answers
  const answerHash = await generateMerkleRoot(dbResult.questions);

  const gameCode = dbResult.game.game_code;

  // 3. Initialize the game on-chain using the database info
  const onChainResult = await initializeGame(program, wallet, {
    ...params,
    gameCode,
    answerHash,
  });

  if (!onChainResult.success) {
    throw new Error(
      `Failed to initialize game on-chain: ${onChainResult.error}`
    );
  }

  // 4. Update the game record with the on-chain pubkey
  await supabase
    .from('games')
    .update({
      game_pubkey: onChainResult.signature,
      answer_merkle_root: answerHash,
    })
    .eq('id', dbResult.game.id);

  return {
    onChain: onChainResult,
    database: dbResult,
  };
};
