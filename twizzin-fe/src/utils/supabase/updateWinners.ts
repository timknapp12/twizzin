import { supabase } from '@/utils/supabase';
import { OnChainWinner } from '@/types';

export async function updateGameWinners(
  gameId: string,
  winners: OnChainWinner[]
): Promise<void> {
  try {
    // Prepare all updates as a single batch operation
    const updates = winners.map((winner) => ({
      game_id: gameId,
      player_wallet: winner.player.toString(),
      rewards_earned: winner.prizeAmount.toString(),
      rewards_claimed: winner.claimed,
      final_rank: winner.rank,
    }));

    // Perform a single upsert operation
    const { error } = await supabase.from('player_games').upsert(updates, {
      onConflict: 'player_wallet,game_id',
      ignoreDuplicates: false,
    });

    for (const winner of winners) {
      console.log(
        `Updating winner: ${winner.player.toString()}, rank: ${
          winner.rank
        }, prize: ${winner.prizeAmount.toString()}`
      );
    }

    if (error) throw error;
  } catch (error) {
    console.error('Error updating game winners:', error);
    throw error;
  }
}
