import { GameReward, UserProfile } from '.';

// Database token information
export interface DbTokenInfo {
  mint_address: string;
  ticker: string;
  name: string;
  decimals: number;
  logo_url: string | null;
}

// Database game details
export interface DbGameInfo {
  id: string;
  name: string;
  game_code: string;
  token_mint: string | null;
  is_native: boolean;
}

// Database player game record
export interface DbPlayerGameRecord {
  id: string;
  join_time: string | null;
  finished_time: string | null;
  num_correct: number;
  rewards_earned: number;
  rewards_claimed: boolean;
  final_rank: number | null;
  xp_earned: number;
  game_id: string;
  game: DbGameInfo | null;
  token_info: DbTokenInfo | null;
}

// Response from getPlayerDataWithRewards function
export interface PlayerRewardsResponse {
  player: {
    wallet_address: string;
    username: string | null;
    total_xp: number;
    created_at: string;
  };
  games: DbPlayerGameRecord[];
}

// Function return type (null if player not found)
export type PlayerRewardsResult = PlayerRewardsResponse | null;

// Helper function to convert DbPlayerGameRecord to GameReward
export function convertToGameReward(
  playerGame: DbPlayerGameRecord
): GameReward | null {
  // Skip games with no associated game info
  if (!playerGame.game) return null;

  return {
    gameId: playerGame.game_id,
    gameName: playerGame.game.name,
    imageUrl: null, // You may need to add this field to your query
    rewardAmount: playerGame.rewards_earned,
    tokenMint: playerGame.game.token_mint || '',
    tokenSymbol: playerGame.token_info?.ticker || 'Unknown',
    claimed: playerGame.rewards_claimed,
  };
}

// Convert the database response to your app's UserProfile and GameReward types
export function processPlayerRewardsResponse(response: PlayerRewardsResponse): {
  userProfile: UserProfile;
  gameRewards: GameReward[];
} {
  // Convert to UserProfile
  const userProfile: UserProfile = {
    walletAddress: response.player.wallet_address,
    username: response.player.username || '',
    totalXP: response.player.total_xp,
    createdAt: response.player.created_at,
  };

  // Convert to GameReward array
  const gameRewards: GameReward[] = response.games
    .map(convertToGameReward)
    .filter((reward): reward is GameReward => reward !== null);

  return {
    userProfile,
    gameRewards,
  };
}
