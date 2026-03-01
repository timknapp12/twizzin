import {
  PublicKey,
  Transaction,
  SystemProgram,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { TwizzinIdl } from '@/types/idl';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { deriveGamePDAs } from './pdas';
import { fetchGameWinners } from './getWinners';
import { authenticatedApiClient } from '../api/authenticatedClient';

export async function endGameAndDeclareWinners(
  program: Program<TwizzinIdl>,
  provider: AnchorProvider,
  params: {
    gameId: string;
    gameCode: string;
    isNative: boolean;
    vaultTokenAccount?: PublicKey;
    adminTokenAccount?: PublicKey;
    treasuryTokenAccount?: PublicKey;
  }
) {
  const admin = provider.wallet.publicKey;
  if (!admin) throw new Error('Wallet not connected');

  // Get game data from API
  const gameResult = await authenticatedApiClient.getGameById(params.gameId);

  if (!gameResult.success || !gameResult.data) {
    throw new Error(`Failed to fetch game data: ${gameResult.error}`);
  }

  const gameData = gameResult.data;

  try {

    // Get submissions and determine winners using API
    const submissionsResult = await authenticatedApiClient.getGameSubmissions(
      params.gameId,
      gameData.max_winners,
      gameData.all_are_winners
    );

    if (!submissionsResult.success || !submissionsResult.data) {
      throw new Error(`Failed to fetch game submissions: ${submissionsResult.error}`);
    }

    const gameResults = submissionsResult.data;

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

    // Add compute budget instruction to increase CU limit
    const computeBudgetInstruction = ComputeBudgetProgram.setComputeUnitLimit({
      units: 1_400_000,
    });
    transaction.add(computeBudgetInstruction);

    const endGameAccounts = {
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
      systemProgram: SystemProgram.programId,
    };

    // Add endGame instruction
    const endGameIx = await program.methods
      .endGame()
      // @ts-ignore
      .accounts(endGameAccounts)
      .instruction();
    transaction.add(endGameIx);

    // Only add declareWinners instruction if there are winners
    if (gameResults.winners.length > 0) {
      const winnerPDAs = await Promise.all(
        gameResults.winners.map(async (winner: any) => {
          const winnerPubkey = new PublicKey(winner.wallet);
          const [playerPda] = PublicKey.findProgramAddressSync(
            [
              Buffer.from('player'),
              gamePda.toBuffer(),
              winnerPubkey.toBuffer(),
            ],
            program.programId
          );
          return playerPda;
        })
      );

      const declareWinnersAccounts = {
        admin,
        game: gamePda,
        vault: vaultPda, // Added vault account
        vaultTokenAccount: params.isNative ? null : params.vaultTokenAccount, // Added conditional vaultTokenAccount
        winners: winnersPda,
        systemProgram: SystemProgram.programId,
      };

      const declareWinnersIx = await program.methods
        .declareWinners(gameResults.winners.map((w: any) => new PublicKey(w.wallet)))
        // @ts-ignore
        .accounts(declareWinnersAccounts)
        .remainingAccounts(
          winnerPDAs.map((pda) => ({
            pubkey: pda,
            isWritable: false,
            isSigner: false,
          }))
        )
        .instruction();
      transaction.add(declareWinnersIx);
    }

    // Send and confirm transaction
    const signature = await provider.sendAndConfirm(transaction);
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature,
      ...latestBlockhash,
    });

    // Update game status in database via API
    const statusResult = await authenticatedApiClient.endGameStatus(params.gameId);

    if (!statusResult.success) {
      console.error(`Failed to update game status via API: ${statusResult.error}`);
      // Log clearly but don't throw - on-chain transaction already succeeded
    }

    // Only fetch and update winner information if there are winners
    if (gameResults.winners.length > 0) {
      const onChainWinners = await fetchGameWinners(
        program,
        admin,
        params.gameCode
      );

      const winnersResult = await authenticatedApiClient.updateWinners(
        params.gameId,
        onChainWinners
      );

      if (!winnersResult.success) {
        console.error(`Failed to update winners via API: ${winnersResult.error}`);
        // Log clearly but don't throw - on-chain transaction already succeeded
      }
    }

    // Distribute XP if there are players
    if (gameResults.allPlayers.length > 0) {
      const xpResult = await authenticatedApiClient.distributeXP(
        params.gameId,
        gameResults.allPlayers,
        gameData.even_split,
        gameResults.allPlayers.length
      );

      if (!xpResult.success) {
        console.error(`Failed to distribute XP via API: ${xpResult.error}`);
        // Log clearly but don't throw - on-chain transaction already succeeded
      }
    }

    return {
      success: true,
      signature,
      error: null,
      winners: gameResults.winners,
      leaderboard: gameResults.allPlayers,
    };
  } catch (error: any) {
    console.error('Failed to end game and declare winners:', error);

    // Check if this is a "transaction already processed" error
    if (error?.message?.includes('This transaction has already been processed')) {
      console.log('Game already ended, treating as success');
      // Try to get the game results even though the transaction failed
      try {
        const submissionsResult = await authenticatedApiClient.getGameSubmissions(
          params.gameId,
          gameData.max_winners,
          gameData.all_are_winners
        );

        if (submissionsResult.success && submissionsResult.data) {
          const gameResults = submissionsResult.data;
          return {
            success: true,
            signature: null, // No new signature since transaction was already processed
            error: null,
            winners: gameResults.winners,
            leaderboard: gameResults.allPlayers,
          };
        }
      } catch (resultsError) {
        console.error('Failed to get game results after duplicate transaction:', resultsError);
      }
    }

    return {
      success: false,
      signature: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      winners: [],
      leaderboard: [],
    };
  }
}
