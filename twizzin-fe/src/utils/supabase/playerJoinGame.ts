import { supabase } from './supabaseClient';

// Record that a player has joined a game and store username
export const recordPlayerJoinGame = async (
  gameId: string,
  playerWallet: string,
  username?: string
) => {
  try {
    // First ensure the player exists in the players table with the username
    await ensurePlayerExists(playerWallet, username);

    // Get the current timestamp
    const joinTime = new Date().toISOString();

    // Check if a record already exists for this player and game
    const { data: existingRecord, error: checkError } = await supabase
      .from('player_games')
      .select('id, join_time')
      .eq('player_wallet', playerWallet)
      .eq('game_id', gameId)
      .maybeSingle();

    if (checkError) {
      throw new Error('Failed to check existing player game record');
    }

    // If record exists and join_time is already set, don't update it
    if (existingRecord && existingRecord.join_time) {
      return {
        success: true,
        message: 'Player has already joined this game',
        playerGameId: existingRecord.id,
      };
    }

    // Insert or update the player_games record
    const { data, error } = await supabase
      .from('player_games')
      .upsert(
        {
          player_wallet: playerWallet,
          game_id: gameId,
          join_time: joinTime,
          // Initialize other fields with defaults
          num_correct: 0,
          rewards_earned: 0,
          rewards_claimed: false,
        },
        {
          onConflict: 'player_wallet,game_id',
          ignoreDuplicates: false,
        }
      )
      .select('id')
      .single();

    if (error) {
      console.error('Error recording player join:', error);
      throw new Error('Failed to record player join: ' + error.message);
    }

    return {
      success: true,
      message: 'Player joined game successfully',
      playerGameId: data?.id,
    };
  } catch (error) {
    console.error('Error recording player join:', error);
    throw error;
  }
};

// Import the ensurePlayerExists function or include it here
const ensurePlayerExists = async (walletAddress: string, username?: string) => {
  try {
    // First try to get existing player
    const { data: existingPlayer } = await supabase
      .from('players')
      .select()
      .eq('wallet_address', walletAddress)
      .single();

    if (existingPlayer) {
      // If player exists but username is provided and different from current one,
      // update the username
      if (username && existingPlayer.username !== username) {
        const { data: updatedPlayer, error: updateError } = await supabase
          .from('players')
          .update({ username })
          .eq('wallet_address', walletAddress)
          .select()
          .single();

        if (updateError) throw updateError;
        return updatedPlayer;
      }

      return existingPlayer;
    }

    // If player doesn't exist, create them with the username if provided
    const playerData: { wallet_address: string; username?: string } = {
      wallet_address: walletAddress,
    };

    // Add username to player data if provided
    if (username) {
      playerData.username = username;
    }

    const { data: newPlayer, error } = await supabase
      .from('players')
      .insert([playerData])
      .select()
      .single();

    if (error) throw error;
    return newPlayer;
  } catch (error) {
    console.error('Error ensuring player exists:', error);
    throw error;
  }
};
