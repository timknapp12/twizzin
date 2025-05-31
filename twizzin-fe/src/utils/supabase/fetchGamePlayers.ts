import { supabase } from './supabaseClient';

export interface GamePlayer {
  id: string;
  username: string;
  wallet_address: string;
  joined_at: string;
  xp?: number;
  level?: number;
}

interface PlayerGameData {
  id: string;
  join_time: string;
  player_wallet: string;
  xp_earned: number;
  players: {
    username: string;
    total_xp: number;
  } | null;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchPlayerWithRetry = async (
  gameId: string,
  walletAddress: string,
  retries = 3,
  delayMs = 1000
): Promise<GamePlayer | null> => {
  for (let i = 0; i < retries; i++) {
    const { data: players, error: playerError } = await supabase
      .from('player_games')
      .select(
        `
        id,
        join_time,
        player_wallet,
        players:player_wallet (
          username
        )
      `
      )
      .eq('game_id', gameId)
      .eq('player_wallet', walletAddress);

    if (playerError) throw playerError;
    if (!players || players.length === 0) return null;

    const player = players[0] as unknown as PlayerGameData;

    // If we have the player data but no username yet, wait and retry
    if (!player.players?.username) {
      if (i < retries - 1) {
        await delay(delayMs);
        continue;
      }
    }

    return {
      id: player.id,
      username: player.players?.username || '',
      wallet_address: player.player_wallet,
      joined_at: player.join_time,
    };
  }
  return null;
};

export const fetchGamePlayers = async (
  gameCode: string
): Promise<GamePlayer[]> => {
  try {
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id')
      .eq('game_code', gameCode)
      .single();

    if (gameError) throw gameError;
    if (!game) return [];

    const { data: players, error: playersError } = await supabase
      .from('player_games')
      .select(
        `
        id,
        join_time,
        player_wallet,
        players:player_wallet (
          username
        )
      `
      )
      .eq('game_id', game.id)
      .order('join_time', { ascending: true });

    if (playersError) throw playersError;

    // For each player, try to fetch their data with retry
    const playerPromises = (players || []).map(async (player: unknown) => {
      const typedPlayer = player as PlayerGameData;
      // If we already have the username, return it immediately
      if (typedPlayer.players?.username) {
        return {
          id: typedPlayer.id,
          username: typedPlayer.players.username,
          wallet_address: typedPlayer.player_wallet,
          joined_at: typedPlayer.join_time,
        };
      }
      // Otherwise, try to fetch with retry
      return fetchPlayerWithRetry(game.id, typedPlayer.player_wallet);
    });

    const results = await Promise.all(playerPromises);
    return results.filter((player): player is GamePlayer => player !== null);
  } catch (error) {
    console.error('Error fetching game players:', error);
    return [];
  }
};

export const fetchPlayerData = async (
  gameCode: string,
  walletAddress: string
): Promise<GamePlayer | null> => {
  try {
    // First get the game ID from the game code
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id')
      .eq('game_code', gameCode)
      .maybeSingle();

    if (gameError) throw gameError;
    if (!game) return null;

    // Now use the game ID to fetch player data
    const { data: players, error: playerError } = await supabase
      .from('player_games')
      .select(
        `
        id,
        join_time,
        player_wallet,
        xp_earned,
        players:player_wallet (
          username,
          total_xp
        )
      `
      )
      .eq('game_id', game.id)
      .eq('player_wallet', walletAddress);

    if (playerError) throw playerError;
    if (!players || players.length === 0) return null;

    const player = players[0] as unknown as PlayerGameData;

    return {
      id: player.id,
      username: player.players?.username || '',
      wallet_address: player.player_wallet,
      joined_at: player.join_time,
      xp: player.players?.total_xp || 0,
    };
  } catch (error) {
    console.error('Error fetching player data:', error);
    return null;
  }
};
