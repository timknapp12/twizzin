import { supabase } from './supabaseClient';
import { OnChainWinner } from '@/types';

export async function updateGameWinners(
  gameId: string,
  winners: OnChainWinner[]
): Promise<void> {
  try {
    for (const winner of winners) {
      console.log(
        `Updating winner: ${winner.player.toString()}, rank: ${
          winner.rank
        }, prize: ${winner.prizeAmount.toString()}`
      );

      // Fetch the current record first to preserve other fields
      const { data: existingRecord, error: fetchError } = await supabase
        .from('player_games')
        .select('*')
        .eq('game_id', gameId)
        .eq('player_wallet', winner.player.toString())
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 is the "not found" error
        console.error('Error fetching existing record:', fetchError);
        continue; // Skip this record and continue with others
      }

      // Convert the prize amount to a number instead of a string
      const prizeAmount = winner.prizeAmount.toString();
      console.log('prizeAmount', prizeAmount);
      console.log('Raw prize amount BN:', winner.prizeAmount);

      // Prepare the update with the winner data
      const updateData: any = {
        game_id: gameId,
        player_wallet: winner.player.toString(),
        rewards_earned: prizeAmount,
        rewards_claimed: winner.claimed,
        final_rank: winner.rank,
      };

      // If there is an existing record, merge any fields we want to preserve
      if (existingRecord) {
        // Preserve existing join_time if it exists
        if (existingRecord.join_time) {
          updateData.join_time = existingRecord.join_time;
        }

        // Preserve finished_time if it exists
        if (existingRecord.finished_time) {
          updateData.finished_time = existingRecord.finished_time;
        }

        // Preserve other fields you might want to keep
        if (
          existingRecord.num_correct !== null &&
          existingRecord.num_correct !== undefined
        ) {
          updateData.num_correct = existingRecord.num_correct;
        }

        if (existingRecord.answer_hash) {
          updateData.answer_hash = existingRecord.answer_hash;
        }

        if (existingRecord.solana_signature) {
          updateData.solana_signature = existingRecord.solana_signature;
        }
      }

      // Perform the update/insert
      const { error: updateError } = await supabase
        .from('player_games')
        .upsert(updateData, {
          onConflict: 'player_wallet,game_id',
          ignoreDuplicates: false,
        });

      if (updateError) {
        console.error('Error updating winner:', updateError);
      }
    }
  } catch (error) {
    console.error('Error updating game winners:', error);
    throw error;
  }
}
