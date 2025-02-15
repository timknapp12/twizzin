import { PublicKey, Connection, Transaction } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { TwizzinIdl } from '@/types/idl';
import { supabase } from '@/utils/supabase';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  // getOrCreateAssociatedTokenAccount
} from '@solana/spl-token';
import { deriveGamePDAs } from './pdas';
import { distributeGameXP } from '@/utils/supabase/xp';
import {
  fetchGameSubmissions,
  determineWinnersAndLeaderboard,
} from '@/utils/supabase/getGameResults';
import { fetchGameWinners } from './getWinners';
import { updateGameWinners } from '../supabase/updateWinners';

export async function endGameAndDeclareWinners(
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
) {
  try {
    // Get game data from Supabase
    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', params.gameId)
      .single();

    if (gameError || !gameData) {
      throw new Error(`Failed to fetch game data: ${gameError?.message}`);
    }

    // Get submissions and determine winners using utility functions
    const submissions = await fetchGameSubmissions(params.gameId);
    const gameResults = determineWinnersAndLeaderboard(
      submissions,
      gameData.max_winners,
      gameData.all_are_winners
    );

    if (!gameResults.winners.length) {
      throw new Error('No eligible winners found');
    }

    // Derive PDAs and fetch config
    const { gamePda, vaultPda, configPda, winnersPda } = deriveGamePDAs(
      program,
      admin,
      params.gameCode
    );
    // @ts-ignore
    const config = await program.account.programConfig.fetch(configPda);

    // Create and build transaction
    const transaction = new Transaction();

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

    // Add endGame instruction
    const endGameIx = await program.methods
      .endGame()
      // @ts-ignore
      .accounts(accounts)
      .instruction();
    transaction.add(endGameIx);

    // Create winner PDAs and add declareWinners instruction
    const winnerPDAs = await Promise.all(
      gameResults.winners.map(async (winner) => {
        const winnerPubkey = new PublicKey(winner.wallet);
        const [playerPda] = PublicKey.findProgramAddressSync(
          [Buffer.from('player'), gamePda.toBuffer(), winnerPubkey.toBuffer()],
          program.programId
        );
        return playerPda;
      })
    );

    const declareWinnersIx = await program.methods
      .declareWinners(gameResults.winners.map((w) => new PublicKey(w.wallet)))
      .accounts({
        admin,
        game: gamePda,
        winners: winnersPda,
        systemProgram: program.programId,
      })
      .remainingAccounts(
        winnerPDAs.map((pda) => ({
          pubkey: pda,
          isWritable: false,
          isSigner: false,
        }))
      )
      .instruction();
    transaction.add(declareWinnersIx);

    // Send and confirm transaction
    const signature = await sendTransaction(transaction, connection);
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      ...latestBlockhash,
    });

    // Update game status in database
    const { error: updateError } = await supabase
      .from('games')
      .update({
        status: 'ended',
      })
      .eq('id', params.gameId);

    if (updateError) {
      throw new Error(`Failed to update game status: ${updateError.message}`);
    }

    // Fetch and update winner information
    const onChainWinners = await fetchGameWinners(
      program,
      admin,
      params.gameCode
    );

    await updateGameWinners(params.gameId, onChainWinners);

    // Distribute XP
    await distributeGameXP(
      params.gameId,
      gameResults.allPlayers,
      gameData.even_split
    );

    return {
      success: true,
      signature,
      error: null,
      winners: gameResults.winners,
      leaderboard: gameResults.allPlayers,
    };
  } catch (error: any) {
    console.error('Failed to end game and declare winners:', error);
    return {
      success: false,
      signature: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      winners: [],
      leaderboard: [],
    };
  }
}
