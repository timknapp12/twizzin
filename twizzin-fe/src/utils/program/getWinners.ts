import { Program, web3 } from '@coral-xyz/anchor';
import { TwizzinIdl } from '@/types/idl';
import { deriveGamePDAs } from './pdas';
import { OnChainWinner } from '@/types';

export async function fetchGameWinners(
  program: Program<TwizzinIdl>,
  admin: web3.PublicKey,
  gameCode: string
): Promise<OnChainWinner[]> {
  try {
    const { winnersPda } = deriveGamePDAs(program, admin, gameCode);

    // Fetch the Winners account
    // @ts-ignore
    const winnersAccount = await program.account.winners.fetch(winnersPda);
    // Transform the data into a more usable format
    return winnersAccount.winners.map(
      (winner: {
        player: web3.PublicKey;
        rank: number;
        prizeAmount: number;
        claimed: boolean;
      }) => ({
        player: winner.player,
        rank: winner.rank,
        prizeAmount: winner.prizeAmount,
        claimed: winner.claimed,
      })
    );
  } catch (error) {
    console.error('Error fetching game winners:', error);
    throw error;
  }
}
