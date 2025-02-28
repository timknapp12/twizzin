import { supabase } from '@/utils/supabase';
import {
  PlayerResult,
  XPDistributionConfig,
  DEFAULT_XP_CONFIG,
  XPAward,
} from '@/types';

export async function distributeGameXP(
  gameId: string,
  players: PlayerResult[],
  isEvenSplit: boolean,
  config: XPDistributionConfig = DEFAULT_XP_CONFIG
): Promise<void> {
  try {
    const xpAwards: XPAward[] = [];

    for (const player of players) {
      let totalXP = config.baseParticipationXP;
      const xpBreakdown: string[] = [
        `Base participation: ${config.baseParticipationXP}`,
      ];

      // Add XP for correct answers
      const answerXP = player.numCorrect * config.answerXPMultiplier;
      totalXP += answerXP;
      xpBreakdown.push(`Correct answers (${player.numCorrect}): ${answerXP}`);

      if (player.isWinner) {
        // Add winner base XP
        totalXP += config.winnerBaseXP;
        xpBreakdown.push(`Winner bonus: ${config.winnerBaseXP}`);

        // Add placement bonuses
        if (player.rank === 1) {
          totalXP += config.firstPlaceBonus;
          xpBreakdown.push(`First place bonus: ${config.firstPlaceBonus}`);
        } else if (!isEvenSplit) {
          // For tiered games, give diminishing bonuses to other winners
          const placementBonus = Math.floor(
            config.firstPlaceBonus / 2 ** ((player.rank ?? 999) - 1)
          );
          if (placementBonus > 0) {
            totalXP += placementBonus;
            xpBreakdown.push(`Placement bonus: ${placementBonus}`);
          }
        }
      }

      xpAwards.push({
        wallet: player.wallet.toString(),
        xpAmount: totalXP,
        reason: `Game ${gameId}: ${xpBreakdown.join(', ')}`,
      });
    }

    // Update player_games with XP earned
    for (const award of xpAwards) {
      try {
        const { error: pgUpdateError } = await supabase
          .from('player_games')
          .update({ xp_earned: award.xpAmount })
          .eq('game_id', gameId)
          .eq('player_wallet', award.wallet);

        if (pgUpdateError) {
          console.error(
            `Failed to update xp_earned for ${award.wallet}:`,
            pgUpdateError
          );
        }

        // Get current player data to check if they exist and get current XP
        const { data: playerData, error: fetchError } = await supabase
          .from('players')
          .select('total_xp')
          .eq('wallet_address', award.wallet)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          // Not found error code
          console.error(`Error fetching player ${award.wallet}:`, fetchError);
          continue;
        }

        if (playerData) {
          // Player exists, update their total XP
          const newTotal = (playerData.total_xp || 0) + award.xpAmount;
          const { error: updateError } = await supabase
            .from('players')
            .update({ total_xp: newTotal })
            .eq('wallet_address', award.wallet);

          if (updateError) {
            console.error(
              `Failed to update total_xp for ${award.wallet}:`,
              updateError
            );
          }
        } else {
          // Player doesn't exist, create them
          const { error: insertError } = await supabase.from('players').insert({
            wallet_address: award.wallet,
            total_xp: award.xpAmount,
          });

          if (insertError) {
            console.error(
              `Failed to create player ${award.wallet}:`,
              insertError
            );
          }
        }
      } catch (playerError) {
        // Log error but continue with other players
        console.error(
          `Error processing XP for player ${award.wallet}:`,
          playerError
        );
      }
    }
  } catch (error) {
    console.error('Error distributing XP:', error);
    // Don't throw - this makes it more resilient
  }
}

// Helper function to get a user's current XP level based on total XP
export async function getUserXPLevel(wallet: string): Promise<{
  currentXP: number;
  level: number;
  nextLevelXP: number;
  progress: number;
}> {
  try {
    const { data, error } = await supabase
      .from('players') // Changed from 'users' to 'players'
      .select('total_xp')
      .eq('wallet_address', wallet) // Changed from 'wallet' to 'wallet_address'
      .single();

    // If player not found or any error, return default values with 0 XP
    if (error || !data) {
      return {
        currentXP: 0,
        level: 0,
        nextLevelXP: 100, // First level requires 100 XP
        progress: 0,
      };
    }

    const totalXP = data.total_xp || 0;

    // Calculate level based on XP (example progression)
    // Level N requires N^2 * 100 XP
    const level = Math.floor(Math.sqrt(totalXP / 100));
    const currentLevelXP = level * level * 100;
    const nextLevelXP = (level + 1) * (level + 1) * 100;
    const progress =
      (totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP);

    return {
      currentXP: totalXP,
      level,
      nextLevelXP,
      progress,
    };
  } catch (error) {
    console.error('Error getting user XP level:', error);
    // Return default values instead of throwing
    return {
      currentXP: 0,
      level: 0,
      nextLevelXP: 100,
      progress: 0,
    };
  }
}
