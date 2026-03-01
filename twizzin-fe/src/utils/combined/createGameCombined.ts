import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { NATIVE_MINT } from '@solana/spl-token';
import { initializeGame } from '../program/initGame';
import { CreateGameCombinedParams } from '@/types';
import { TwizzinIdl } from '@/types/idl';
import { generateMerkleRoot } from '../merkle/generateMerkleRoot';
import { getAnchorTimestamp, getSupabaseTimestamp } from '../helpers';
import { authenticatedApiClient } from '../api/authenticatedClient';

export const createGameCombined = async (
  program: Program<TwizzinIdl>,
  provider: AnchorProvider,
  params: CreateGameCombinedParams
) => {
  const publicKey = provider.wallet.publicKey;
  if (!publicKey) throw new Error('Wallet not connected');

  const isNative = params.tokenMint.equals(NATIVE_MINT);

  try {
    // 1. First create database entries using authenticated API
    const apiResult = await authenticatedApiClient.createGame(
      {
        gamePubkey: '',
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
      params.imageFile || undefined
    );

    if (!apiResult.success) {
      throw new Error(apiResult.error || 'Failed to create game in database');
    }

    const dbResult = apiResult.data;

    // 2. Generate merkle root
    const answerHash = await generateMerkleRoot(dbResult.questions);

    // 3. Get game code and prepare timestamps
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

    // 4. Initialize on-chain
    const onChainResult = await initializeGame(
      program,
      provider,
      paramsForOnChain
    );

    if (!onChainResult.success) {
      throw new Error(
        `Failed to initialize game on-chain: ${onChainResult.error}`
      );
    }

    // 5. Update database with on-chain info via API
    const updateResult = await authenticatedApiClient.updateOnchainInfo(
      dbResult.game.id,
      onChainResult.signature ?? '',
      answerHash
    );

    if (!updateResult.success) {
      console.error(`Failed to update on-chain info via API: ${updateResult.error}`);
      // Log clearly but don't throw - on-chain transaction already succeeded
    }

    return {
      onChain: onChainResult,
      database: dbResult,
    };
  } catch (err: unknown) {
    console.log('❌ Error creating game:', err);

    // Check if the error is about transaction already processed
    if (
      err instanceof Error &&
      (err.message?.includes('already been processed') ||
        err.message?.includes('This transaction has already been processed'))
    ) {
      throw new Error(
        'Network issue detected. Please try creating the game again - this usually resolves the issue.'
      );
    }

    throw err;
  }
};
