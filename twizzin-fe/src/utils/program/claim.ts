import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { TwizzinIdl } from '@/types/idl';
import { deriveGamePDAs, derivePlayerPDA } from './pdas';

export interface ClaimParams {
  program: Program<TwizzinIdl>;
  provider: AnchorProvider;
  playerPubkey: PublicKey;
  adminPubkey: PublicKey;
  gameCode: string;
  mint?: PublicKey;
  isNative: boolean;
}

export async function claim({
  program,
  provider,
  playerPubkey,
  adminPubkey,
  gameCode,
  mint,
  isNative,
}: ClaimParams): Promise<string> {
  try {
    // Derive all necessary PDAs
    const { gamePda, vaultPda, winnersPda } = deriveGamePDAs(
      program,
      adminPubkey,
      gameCode
    );

    const playerPda = derivePlayerPDA(program, gamePda, playerPubkey);

    // Prepare accounts for the transaction
    const accounts: any = {
      player: playerPubkey,
      game: gamePda,
      winners: winnersPda,
      playerAccount: playerPda,
      vault: vaultPda,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    };

    // Handle token accounts based on whether the game uses native SOL or SPL tokens
    if (isNative) {
      // For native SOL games, we pass null for token accounts
      accounts.vaultTokenAccount = null;
      accounts.playerTokenAccount = null;
    } else {
      // For SPL token games, we need the token mint and associated token accounts
      if (!mint) {
        throw new Error('Token mint is required for SPL token games');
      }

      const vaultTokenAccount = await getAssociatedTokenAddress(
        mint,
        vaultPda,
        true // allowOwnerOffCurve set to true for PDAs
      );

      const playerTokenAccount = await getAssociatedTokenAddress(
        mint,
        playerPubkey
      );

      accounts.vaultTokenAccount = vaultTokenAccount;
      accounts.playerTokenAccount = playerTokenAccount;
    }

    // Build the transaction
    const instruction = await program.methods
      .claim()
      .accounts(accounts)
      .instruction();

    const transaction = new Transaction().add(instruction);

    // Send the transaction using the provider
    return await provider.sendAndConfirm(transaction);
  } catch (error) {
    console.error('Error in claim function:', error);
    throw error;
  }
}

// Helper function to check if a player is a winner and if they've already claimed
export async function getWinnerStatus(
  program: Program<TwizzinIdl>,
  adminPubkey: PublicKey,
  gameCode: string,
  playerPubkey: PublicKey
): Promise<{
  isWinner: boolean;
  hasClaimed: boolean;
  rank: number;
  prizeAmount: bigint;
}> {
  try {
    const { winnersPda } = deriveGamePDAs(program, adminPubkey, gameCode);

    // Fetch the winners account
    // @ts-ignore
    const winnersAccount = await program.account.winners.fetch(winnersPda);

    // Find the winner entry for this player
    const winnerEntry = winnersAccount.winners.find(
      (winner: { player: PublicKey }) =>
        winner.player.toString() === playerPubkey.toString()
    );

    if (winnerEntry) {
      return {
        isWinner: true,
        hasClaimed: winnerEntry.claimed,
        rank: winnerEntry.rank,
        prizeAmount: winnerEntry.prizeAmount,
      };
    }

    return {
      isWinner: false,
      hasClaimed: false,
      rank: 0,
      prizeAmount: BigInt(0),
    };
  } catch (error) {
    console.error('Error checking winner status:', error);
    return {
      isWinner: false,
      hasClaimed: false,
      rank: 0,
      prizeAmount: BigInt(0),
    };
  }
}
