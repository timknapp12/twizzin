import { supabase } from '@/utils/supabase';
import { OnChainWinner } from '@/types';

export async function updateGameWinners(
  gameId: string,
  winners: OnChainWinner[]
): Promise<void> {
  try {
    // Start a transaction to update all winners
    const { error } = await supabase.rpc('begin_transaction');
    if (error) throw error;

    try {
      // Update each winner's record
      for (const winner of winners) {
        const { error: updateError } = await supabase
          .from('player_games')
          .update({
            rewards_earned: winner.prizeAmount.toString(), // Convert BigInt to string
            rewards_claimed: winner.claimed,
            final_rank: winner.rank,
          })
          .eq('game_id', gameId)
          .eq('player_wallet', winner.player.toString());

        if (updateError) throw updateError;
      }

      // Commit the transaction
      const { error: commitError } = await supabase.rpc('commit_transaction');
      if (commitError) throw commitError;
    } catch (error) {
      // Rollback on any error
      await supabase.rpc('rollback_transaction');
      throw error;
    }
  } catch (error) {
    console.error('Error updating game winners:', error);
    throw error;
  }
}
