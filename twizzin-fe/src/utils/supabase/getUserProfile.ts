import { supabase } from './supabaseClient';

/**
 * Get player data including games with rewards
 * @param walletAddress The player's wallet address
 * @returns Player profile and games with rewards information
 */
export const getPlayerDataWithRewards = async (walletAddress: string) => {
  try {
    // First, get the basic player data
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .select('wallet_address, username, total_xp, created_at')
      .eq('wallet_address', walletAddress)
      .single();

    if (playerError) {
      if (playerError.code === 'PGRST116') {
        // Not found error
        console.log(`No player found with wallet address: ${walletAddress}`);
        return null;
      }
      console.error('Error fetching player data:', playerError);
      throw playerError;
    }

    // Then, get the player's games with rewards
    // First get the basic player_games data
    const { data: playerGames, error: gamesError } = await supabase
      .from('player_games')
      .select(
        `
        id,
        join_time,
        finished_time,
        num_correct,
        rewards_earned,
        rewards_claimed,
        final_rank,
        xp_earned,
        game_id
      `
      )
      .eq('player_wallet', walletAddress)
      .gt('rewards_earned', 0) // Only include games with rewards
      .order('rewards_claimed', { ascending: true }) // Unclaimed rewards first
      .order('finished_time', { ascending: false }); // Most recent games first

    if (gamesError) {
      console.error('Error fetching player games:', gamesError);
      throw gamesError;
    }

    // For each player game, fetch the game details separately
    const gamesWithDetails = await Promise.all(
      playerGames.map(async (playerGame) => {
        // Get game details
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('id, name, game_code, token_mint, is_native')
          .eq('id', playerGame.game_id)
          .single();

        if (gameError) {
          console.error('Error fetching game details:', gameError);
          return {
            ...playerGame,
            game: null,
            token_info: null,
          };
        }

        let tokenInfo = null;

        // If game has token_mint, fetch token details
        if (gameData.token_mint) {
          const { data: tokenData, error: tokenError } = await supabase
            .from('tokens')
            .select('mint_address, ticker, name, decimals, logo_url')
            .eq('mint_address', gameData.token_mint)
            .single();

          if (!tokenError) {
            tokenInfo = tokenData;
          } else if (tokenError.code !== 'PGRST116') {
            console.error('Error fetching token info:', tokenError);
          }
        }

        return {
          ...playerGame,
          game: gameData,
          token_info: tokenInfo,
        };
      })
    );

    // Combine all data
    return {
      player: playerData,
      games: gamesWithDetails,
    };
  } catch (error) {
    console.error('Error in getPlayerDataWithRewards:', error);
    throw error;
  }
};

// Example usage:
// const playerRewards = await getPlayerDataWithRewards('9PFiMki6eJKF238GDyEBt7yfeNL6JGD2Y');
// if (playerRewards) {
//   console.log(`Player: ${playerRewards.player.username || 'Anonymous'}`);
//   console.log(`Total XP: ${playerRewards.player.total_xp}`);
//   console.log(`Games with rewards: ${playerRewards.games.length}`);
//
//   // Display unclaimed rewards first
//   playerRewards.games.forEach(game => {
//     if (!game.game) return;
//
//     const tokenSymbol = game.token_info?.ticker || 'Unknown';
//     const claimedStatus = game.rewards_claimed ? 'Claimed' : 'Unclaimed';
//     console.log(`Game: ${game.game.name}, Reward: ${game.rewards_earned} ${tokenSymbol} (${claimedStatus})`);
//   });
// }
