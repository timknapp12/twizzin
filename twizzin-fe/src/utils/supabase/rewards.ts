import { supabase } from '@/utils/supabase';
import { GameReward, PlayerGameReward } from '@/types';

export async function getUserRewards(wallet: string): Promise<GameReward[]> {
  try {
    // First get player games with game info
    const { data, error } = await supabase
      .from('player_games')
      .select(
        `
        game_id,
        rewards_earned,
        rewards_claimed,
        game:games (
          name,
          img_url,
          token_mint
        )
      `
      )
      .eq('player_wallet', wallet)
      .gt('rewards_earned', 0)
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.error('Error fetching user rewards:', error);
      return [];
    }

    // Then fetch token info for each unique token_mint
    const rewards = await Promise.all(
      (data as PlayerGameReward[])
        .filter((entry) => entry.game?.[0]?.token_mint)
        .map(async (entry) => {
          const game = entry.game[0];
          if (!game) return null;

          // Get token info
          const { data: tokenData } = await supabase
            .from('tokens')
            .select('ticker')
            .eq('mint_address', game.token_mint)
            .single();

          return {
            gameId: entry.game_id,
            gameName: game.name,
            imageUrl: game.img_url,
            rewardAmount: Number(entry.rewards_earned),
            tokenMint: game.token_mint,
            tokenSymbol: tokenData?.ticker || 'UNKNOWN',
            claimed: entry.rewards_claimed,
          };
        })
    );

    return rewards.filter((reward): reward is GameReward => reward !== null);
  } catch (error) {
    console.error('Error fetching user rewards:', error);
    return [];
  }
}
