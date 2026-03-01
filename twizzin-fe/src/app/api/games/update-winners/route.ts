import { NextRequest, NextResponse } from 'next/server';
import { createAdminHandler } from '@/lib/auth';
import { updateGameWinners } from '@/utils/supabase/updateWinners';
import { getGameById } from '@/utils/supabase/getGameFromDb';
import { OnChainWinner } from '@/types';

interface UpdateWinnersRequest {
  gameId: string;
  winners: OnChainWinner[];
}

export const POST = createAdminHandler(async (request: NextRequest, user) => {
  try {
    const body: UpdateWinnersRequest = await request.json();
    const { gameId, winners } = body;

    // Validate required fields
    if (!gameId || !winners || !Array.isArray(winners)) {
      return NextResponse.json(
        { error: 'Missing required fields: gameId and winners array' },
        { status: 400 }
      );
    }

    // First, verify that the user is the admin of this game
    const game = await getGameById(gameId);
    
    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    if (game.admin_wallet !== user.wallet_address) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only update winners for games you created' },
        { status: 403 }
      );
    }

    // Validate that the game is in a state where winners can be set
    if (game.status === 'pending') {
      return NextResponse.json(
        { error: 'Cannot set winners for a game that has not started' },
        { status: 400 }
      );
    }

    // Validate winners data structure
    for (const winner of winners) {
      if (!winner.player || winner.rank === undefined || !winner.prizeAmount) {
        return NextResponse.json(
          { error: 'Invalid winner data structure' },
          { status: 400 }
        );
      }
    }

    // Update the winners
    await updateGameWinners(game.id, winners);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Winners updated successfully',
        gameId: game.id,
        winnersCount: winners.length,
      },
    });

  } catch (error: any) {
    console.error('Error updating winners:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update winners' },
      { status: 500 }
    );
  }
});