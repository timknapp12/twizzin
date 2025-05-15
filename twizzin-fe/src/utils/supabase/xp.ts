import { supabase } from '@/utils/supabase';
import {
  PlayerResult,
  XPDistributionConfig,
  DEFAULT_XP_CONFIG,
  XPAward,
} from '@/types';

export const XP_PER_PLAYER = 10;

export async function distributeGameXP(
  gameId: string,
  players: PlayerResult[],
  isEvenSplit: boolean,
  adminWallet: string,
  playerLength: number,
  config: XPDistributionConfig = DEFAULT_XP_CONFIG
): Promise<void> {
  if (!gameId || !adminWallet || !Array.isArray(players) || players.length === 0) {
    console.warn('distributeGameXP: Missing required parameters.');
    return;
  }

  const adminXp = playerLength * XP_PER_PLAYER;
  try {
    // Create admin record in player_games
    const { error: adminInsertError } = await supabase
      .from('player_games')
      .insert({
        game_id: gameId,
        player_wallet: adminWallet,
        xp_earned: adminXp,
        is_admin: true,
      });

    if (adminInsertError) {
      console.error(
        `Failed to create admin record in player_games for ${adminWallet}:`,
        adminInsertError
      );
    }

    // Update admin's total XP in players table
    const { data: adminData, error: adminFetchError } = await supabase
      .from('players')
      .select('total_xp')
      .eq('wallet_address', adminWallet)
      .single();

    if (adminFetchError && adminFetchError.code !== 'PGRST116') {
      console.error(`Error fetching admin ${adminWallet}:`, adminFetchError);
    } else if (adminData) {
      // Admin exists, update their total XP
      const newAdminTotal = (adminData.total_xp || 0) + adminXp;
      const { error: adminUpdateError } = await supabase
        .from('players')
        .update({ total_xp: newAdminTotal })
        .eq('wallet_address', adminWallet);

      if (adminUpdateError) {
        console.error(
          `Failed to update admin total_xp for ${adminWallet}:`,
          adminUpdateError
        );
      }
    } else {
      // Admin doesn't exist, create them
      const { error: adminInsertError } = await supabase
        .from('players')
        .insert({
          wallet_address: adminWallet,
          total_xp: adminXp,
        });

      if (adminInsertError) {
        console.error(
          `Failed to create admin player ${adminWallet}:`,
          adminInsertError
        );
      }
    }

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

type VerificationFunction = <T>(operation: () => Promise<T>, errorMessage?: string) => Promise<T | null>;

export async function getUserXPLevel(
  wallet: string,
  withVerification: VerificationFunction
): Promise<{
  currentXP: number;
  level: number;
  nextLevelXP: number;
  progress: number;
  gameHistory: Array<{
    gameId: string;
    gameName: string;
    gameDate: string;
    questionsCorrect: number;
    totalQuestions: number;
    xpEarned: number;
    finalRank: number | null;
    isAdmin: boolean;
  }>;
} | null> {
  return withVerification(async () => {
    if (!wallet) {
      throw new Error('Wallet address is required');
    }

    try {
      // Get total XP from players table
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('total_xp')
        .eq('wallet_address', wallet)
        .single();

      if (playerError) {
        if (playerError.code === 'PGRST116') {
          console.log('No XP data found for player - returning default values');
          return {
            currentXP: 0,
            level: 0,
            nextLevelXP: 300,
            progress: 0,
            gameHistory: [],
          };
        }
        console.error('Error fetching player XP:', playerError);
        console.log('Full error details:', {
          code: playerError.code,
          message: playerError.message,
          details: playerError.details,
          hint: playerError.hint
        });
        return {
          currentXP: 0,
          level: 0,
          nextLevelXP: 300,
          progress: 0,
          gameHistory: [],
        };
      }

      const totalXP = playerData?.total_xp || 0;

      // Calculate level and progress
      const level = Math.floor(totalXP / 300) + 1;
      const nextLevelXP = level * 300;
      const progress = (totalXP % 300) / 3;

      // Get game history with details using end_time, including finalRank
      const { data: gameData, error: gameError } = await supabase
        .from('player_games')
        .select(
          `
          num_correct,
          xp_earned,
          final_rank,
          is_admin,
          game:games (
            id,
            name,
            end_time
          )
        `
        )
        .eq('player_wallet', wallet)
        .order('game(end_time)', { ascending: false });

      if (gameError) {
        console.error('Error fetching game history:', gameError);
        return {
          currentXP: totalXP,
          level,
          nextLevelXP,
          progress,
          gameHistory: [],
        };
      }

      // For each game, get total questions
      const gameHistory = await Promise.all(
        (gameData || []).map(async (game: any) => {
          const { count } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('game_id', game.game.id);

          return {
            gameId: game.game.id as string,
            gameName: game.game.name as string,
            gameDate: game.game.end_time || 'Not Finished',
            questionsCorrect: game.num_correct || 0,
            totalQuestions: count || 0,
            xpEarned: game.xp_earned || 0,
            finalRank: game.final_rank || null,
            isAdmin: game.is_admin || false,
          };
        })
      );

      return {
        currentXP: totalXP,
        level,
        nextLevelXP,
        progress,
        gameHistory,
      };
    } catch (error) {
      console.error('Error getting user XP level:', error);
      return {
        currentXP: 0,
        level: 0,
        nextLevelXP: 300,
        progress: 0,
        gameHistory: [],
      };
    }
  }, 'Please verify your wallet to view XP level');
}
