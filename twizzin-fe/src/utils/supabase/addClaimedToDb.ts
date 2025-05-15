import { supabase } from '@/utils/supabase';
import { PublicKey } from '@solana/web3.js';

/**
 * Updates the player_games record to mark rewards as claimed
 *
 * @param playerWallet The player's wallet address
 * @param gameId The unique game code
 * @param txSignature Optional transaction signature for reference
 * @returns Object indicating success status and any error message
 */

export async function addClaimedToDb(
  playerWallet: PublicKey | string,
  gameId: string,
  txSignature?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Convert PublicKey to string if needed
    const walletAddress =
      typeof playerWallet === 'string' ? playerWallet : playerWallet.toString();

    // Now update the player_games record
    const { error: updateError } = await supabase
      .from('player_games')
      .update({
        rewards_claimed: true,
        ...(txSignature && { claimed_signature: txSignature }),
      })
      .eq('player_wallet', walletAddress)
      .eq('game_id', gameId);

    if (updateError) {
      console.error('Error updating claim status:', updateError);
      return {
        success: false,
        error: updateError.message,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in addClaimedToDb:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Checks if a player has already claimed rewards for a specific game
 *
 * @param playerWallet The player's wallet address
 * @param gameCode The unique game code
 * @returns Whether the player has already claimed rewards
 */

export async function hasPlayerClaimedRewards(
  playerWallet: PublicKey | string,
  gameCode: string
): Promise<boolean> {
  try {
    // Convert PublicKey to string if needed
    const walletAddress =
      typeof playerWallet === 'string' ? playerWallet : playerWallet.toString();

    // First get the game ID from the game code
    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .select('id')
      .eq('game_code', gameCode)
      .single();

    if (gameError || !gameData) {
      console.error('Error fetching game:', gameError);
      return false;
    }

    // Check if the player has claimed rewards
    const { data, error } = await supabase
      .from('player_games')
      .select('rewards_claimed')
      .eq('player_wallet', walletAddress)
      .eq('game_id', gameData.id)
      .single();

    if (error || !data) {
      console.error('Error checking claim status:', error);
      return false;
    }

    return data.rewards_claimed === true;
  } catch (error) {
    console.error('Error in hasPlayerClaimedRewards:', error);
    return false;
  }
}
