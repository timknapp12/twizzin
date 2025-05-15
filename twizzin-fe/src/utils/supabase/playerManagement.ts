import { supabase } from './supabaseClient';

interface Player {
  wallet_address: string;
  created_at: string;
  username?: string;
  last_login: string;
  updated_at: string;
}

interface PlayerInput {
  wallet_address: string;
  username?: string;
}

type VerificationFunction = <T>(
  operation: () => Promise<T>,
  errorMessage?: string,
  forceVerified?: boolean
) => Promise<T | null>;

/**
 * Fetches a player by their wallet address
 */
const fetchPlayerByWallet = async (wallet_address: string, withVerification: VerificationFunction): Promise<Player | null> => {
  return withVerification(async () => {
    const { data: player, error } = await supabase
      .from('players')
      .select()
      .eq('wallet_address', wallet_address)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        throw error;
      }
    }

    return player;
  });
};

/**
 * Creates a new player in the database
 */
const createPlayer = async (playerData: PlayerInput, withVerification: VerificationFunction): Promise<Player> => {
  return withVerification(async () => {
    const now = new Date().toISOString();
    const newPlayerData = {
      ...playerData,
      created_at: now,
      updated_at: now,
      last_login: now
    };

    const { data: newPlayer, error } = await supabase
      .from('players')
      .insert([newPlayerData])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return newPlayer;
  });
};

/**
 * Updates a player's username
 */
const updatePlayerUsername = async (
  wallet_address: string,
  newUsername: string,
  withVerification: VerificationFunction
): Promise<Player> => {
  return withVerification(async () => {
    const now = new Date().toISOString();
    const updateData = { 
      username: newUsername,
      updated_at: now
    };

    const { data: updatedPlayer, error } = await supabase
      .from('players')
      .update(updateData)
      .eq('wallet_address', wallet_address)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return updatedPlayer;
  });
};

/**
 * Updates a player's last login timestamp
 */
const updateLastLogin = async (
  wallet_address: string,
  withVerification: VerificationFunction
): Promise<Player> => {
  return withVerification(async () => {
    const now = new Date().toISOString();
    const updateData = { 
      last_login: now,
      updated_at: now
    };

    const { data: updatedPlayer, error } = await supabase
      .from('players')
      .update(updateData)
      .eq('wallet_address', wallet_address)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return updatedPlayer;
  });
};

/**
 * Ensures a player exists in the database
 */
export const ensurePlayerExists = async (
  wallet_address: string,
  withVerification: VerificationFunction,
  username?: string,
  forceVerified: boolean = false
): Promise<Player | null> => {
  try {
    // Check if player exists
    const { data: existingPlayer, error: fetchError } = await supabase
      .from('players')
      .select()
      .eq('wallet_address', wallet_address)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // No existing player found - this is expected for new players
      } else {
        throw fetchError;
      }
    }

    if (existingPlayer) {
      // Update last login timestamp
      const now = new Date().toISOString();
      const { data: updatedPlayer, error: updateError } = await supabase
        .from('players')
        .update({ 
          last_login: now,
          updated_at: now
        })
        .eq('wallet_address', wallet_address)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // If username is provided and different from current one, update it
      if (username && existingPlayer.username !== username) {
        const { data: renamedPlayer, error: renameError } = await supabase
          .from('players')
          .update({ 
            username: username,
            updated_at: now
          })
          .eq('wallet_address', wallet_address)
          .select()
          .single();

        if (renameError) {
          throw renameError;
        }

        return renamedPlayer;
      }
      
      return updatedPlayer;
    }

    // If player doesn't exist, create them
    const now = new Date().toISOString();
    const newPlayerData = {
      wallet_address,
      username,
      created_at: now,
      updated_at: now,
      last_login: now
    };

    const { data: newPlayer, error: createError } = await supabase
      .from('players')
      .insert([newPlayerData])
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    return newPlayer;
  } catch (error) {
    throw error;
  }
}; 