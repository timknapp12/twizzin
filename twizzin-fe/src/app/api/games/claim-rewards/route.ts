import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedHandler } from '@/lib/auth';
import { addClaimedToDb, hasPlayerClaimedRewards } from '@/utils/supabase/addClaimedToDb';

interface ClaimRewardsRequest {
  gameId: string;
  txSignature: string;
}

export const POST = createAuthenticatedHandler(async (request: NextRequest, user) => {
  try {
    const body: ClaimRewardsRequest = await request.json();
    const { gameId, txSignature } = body;

    // Validate required fields
    if (!gameId || !txSignature) {
      return NextResponse.json(
        { error: 'Missing required fields: gameId and txSignature' },
        { status: 400 }
      );
    }

    // Check if rewards have already been claimed
    const alreadyClaimed = await hasPlayerClaimedRewards(user.wallet_address, gameId);
    
    if (alreadyClaimed) {
      return NextResponse.json(
        { error: 'Rewards have already been claimed for this game' },
        { status: 409 }
      );
    }

    // Mark rewards as claimed
    const result = await addClaimedToDb(
      user.wallet_address,
      gameId,
      txSignature
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update claim status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Rewards claimed successfully',
        txSignature,
      },
    });

  } catch (error: any) {
    console.error('Error claiming rewards:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to claim rewards' },
      { status: 500 }
    );
  }
});