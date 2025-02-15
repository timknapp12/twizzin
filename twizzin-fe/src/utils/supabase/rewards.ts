import { supabase } from '@/utils/supabase';
import { GameReward, PlayerGameReward } from '@/types';

export async function getUserRewards(wallet: string): Promise<GameReward[]> {
  try {
    const { data, error } = await supabase
      .from('player_games')
      .select(
        `
        game_id,
        rewards_earned,
        rewards_claimed,
        games (
          name,
          img_url,
          token_mint,
          tokens (
            ticker
          )
        )
      `
      )
      .eq('player_wallet', wallet)
      .gt('rewards_earned', 0)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data as PlayerGameReward[]).map((entry) => ({
      gameId: entry.game_id,
      gameName: entry.games[0].name,
      imageUrl: entry.games[0].img_url,
      rewardAmount: Number(entry.rewards_earned),
      tokenMint: entry.games[0].token_mint,
      tokenSymbol: entry.games[0].tokens[0].ticker,
      claimed: entry.rewards_claimed,
    }));
  } catch (error) {
    console.error('Error fetching user rewards:', error);
    throw error;
  }
}

export async function markRewardAsClaimed(
  wallet: string,
  gameId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('player_games')
      .update({ rewards_claimed: true })
      .eq('player_wallet', wallet)
      .eq('game_id', gameId);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking reward as claimed:', error);
    throw error;
  }
}
