import { supabase } from '@/utils/supabase';
import { PlayerResult } from '@/types';

interface XPDistributionConfig {
  baseParticipationXP: number; // XP for participating
  winnerBaseXP: number; // Additional base XP for being a winner
  firstPlaceBonus: number; // Additional XP for first place
  answerXPMultiplier: number; // XP multiplier per correct answer
}

const DEFAULT_XP_CONFIG: XPDistributionConfig = {
  baseParticipationXP: 50,
  winnerBaseXP: 100,
  firstPlaceBonus: 50,
  answerXPMultiplier: 10,
};

interface XPAward {
  wallet: string;
  xpAmount: number;
  reason: string;
}

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
            config.firstPlaceBonus / 2 ** (player.rank - 1)
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

    // Batch insert XP awards into database
    const { error } = await supabase.from('xp_transactions').insert(
      xpAwards.map((award) => ({
        wallet: award.wallet,
        amount: award.xpAmount,
        reason: award.reason,
        game_id: gameId,
        created_at: new Date().toISOString(),
      }))
    );

    if (error) {
      throw new Error(`Failed to insert XP awards: ${error.message}`);
    }

    // Update total XP for each player
    for (const award of xpAwards) {
      const { error: updateError } = await supabase.rpc('update_user_xp', {
        p_wallet: award.wallet,
        p_xp_amount: award.xpAmount,
      });

      if (updateError) {
        console.error(
          `Failed to update total XP for wallet ${award.wallet}:`,
          updateError
        );
      }
    }
  } catch (error) {
    console.error('Error distributing XP:', error);
    throw error;
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
      .from('users')
      .select('total_xp')
      .eq('wallet', wallet)
      .single();

    if (error) throw error;

    const totalXP = data?.total_xp || 0;

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
    throw error;
  }
}
