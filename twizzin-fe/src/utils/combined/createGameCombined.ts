import { Program } from '@coral-xyz/anchor';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import { initializeGame } from '../program/initGame';
import { createGameInDb } from '../supabase/createGame';
import { CreateGameCombinedParams } from '@/types';
import { TwizzinIdl } from '@/types/idl';
import { generateMerkleRoot } from '../merkle/generateMerkleRoot';
import { supabase } from '../supabase/supabaseClient';
import { getAnchorTimestamp, getSupabaseTimestamp } from '../helpers';
import { deriveGamePDAs } from '../program/pdas';

type VerificationFunction = <T>(operation: () => Promise<T>, errorMessage?: string) => Promise<T | null>;

export const createGameCombined = async (
  program: Program<TwizzinIdl>,
  connection: Connection,
  publicKey: PublicKey,
  sendTransaction: (
    // eslint-disable-next-line no-unused-vars
    transaction: Transaction,
    // eslint-disable-next-line no-unused-vars
    connection: Connection
  ) => Promise<string>,
  params: CreateGameCombinedParams,
  withVerification: VerificationFunction
) => {
  if (!publicKey) throw new Error('Wallet not connected');
  console.log('Starting game creation process...');

  const isNative = params.tokenMint.equals(NATIVE_MINT);

  try {
    // 1. First create database entries
    console.log('Step 1: Creating database entries...');
    const dbResult = await createGameInDb(
      {
        gamePubkey: '',
        adminWallet: publicKey.toString(),
        name: params.name,
        tokenMint: params.tokenMint.toString(),
        entryFee: params.entryFee,
        startTime: getSupabaseTimestamp(params.startTime),
        endTime: getSupabaseTimestamp(params.endTime),
        maxWinners: params.maxWinners,
        donationAmount: params.donationAmount ? params.donationAmount : 0,
        isNative: isNative,
        allAreWinners: params.allAreWinners || false,
        evenSplit: params.evenSplit || false,
        answerMerkleRoot: '',
        imgUrl: '',
        commissionBps: params.commission,
        username: params.username,
      },
      params.questions,
      withVerification
    );
    console.log('✅ Database entries created successfully');

    // 2. Generate merkle root
    console.log('Step 2: Generating merkle root...');
    if (!dbResult) {
      throw new Error('Database result is null');
    }

    if (!dbResult.questions || dbResult.questions.length === 0) {
      throw new Error('No questions found for the game');
    }

    const answerHash = await generateMerkleRoot(dbResult.questions);
    console.log('✅ Merkle root generated successfully');

    // 3. Get game code and prepare timestamps
    console.log('Step 3: Preparing on-chain parameters...');
    const gameCode = dbResult.game.game_code;
    // this is so players can join the game after the officical start time if the admin has not manually started the game. When admin starts the game, the start time will be updated as the current time.
    const addOneYear = 31536000000;
    const startTime = getAnchorTimestamp(params.startTime) + addOneYear;
    const endTime = getAnchorTimestamp(params.endTime) + addOneYear;

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
      connection,
      publicKey,
      sendTransaction,
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
    const { gamePda } = deriveGamePDAs(program, publicKey, gameCode);
    await supabase
      .from('games')
      .update({
        game_pubkey: gamePda.toString(),
        answer_merkle_root: answerHash,
      })
      .eq('id', dbResult.game.id);
    console.log('✅ Database updated with on-chain information');

    console.log('🎉 Game creation completed successfully!');
    return {
      onChain: onChainResult,
      database: dbResult,
    };
  } catch (err: unknown) {
    console.log('❌ Error creating game:', err);
    throw err;
  }
};
