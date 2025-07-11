import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { TwizzinIdl } from '@/types/idl';
import { claim, ClaimParams } from '../program/claim';
import { addClaimedToDb } from '../supabase/addClaimedToDb';

/**
 * Combined parameters for the claim process - extends ClaimParams from claim.ts
 */
export interface ClaimCombinedParams extends ClaimParams {
  program: Program<TwizzinIdl>;
  provider: AnchorProvider;
  gameId: string;
}

/**
 * Combined function that handles both on-chain claim and database update
 */
export async function claimCombined({
  program,
  provider,
  playerPubkey,
  adminPubkey,
  gameCode,
  mint,
  isNative,
  gameId,
}: ClaimCombinedParams): Promise<{
  success: boolean;
  signature?: string;
  error?: string;
}> {
  try {
    // 1. Execute the on-chain claim transaction using the imported claim function
    const txId = await claim({
      program,
      provider,
      playerPubkey,
      adminPubkey,
      gameCode,
      mint,
      isNative,
    });

    // 2. Update the database
    const dbUpdateResult = await addClaimedToDb(playerPubkey, gameId, txId);

    if (!dbUpdateResult.success) {
      console.warn(
        'On-chain claim succeeded but database update failed:',
        dbUpdateResult.error
      );
      // We still consider this a success since the on-chain part worked
    }

    return {
      success: true,
      signature: txId,
    };
  } catch (error) {
    console.error('Error in claimCombined function:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
