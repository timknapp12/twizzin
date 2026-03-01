import { NextRequest, NextResponse } from 'next/server';
import { createAdminHandler } from '@/lib/auth';
import { getGameById } from '@/utils/supabase/getGameFromDb';
import { supabaseServer } from '@/utils/supabase/supabaseServerClient';

interface EndGameStatusRequest {
  gameId: string;
}

export const POST = createAdminHandler(async (request: NextRequest, user) => {
  try {
    const body: EndGameStatusRequest = await request.json();
    const { gameId } = body;

    if (!gameId) {
      return NextResponse.json(
        { error: 'Missing required field: gameId' },
        { status: 400 }
      );
    }

    // Verify that the user is the admin of this game
    const game = await getGameById(gameId);

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    if (game.admin_wallet !== user.wallet_address) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only end games you created' },
        { status: 403 }
      );
    }

    // Update game status to 'ended'
    const { error: updateError } = await supabaseServer
      .from('games')
      .update({ status: 'ended' })
      .eq('id', gameId);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update game status: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Game status updated to ended',
        gameId,
      },
    });
  } catch (error: any) {
    console.error('Error updating game status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update game status' },
      { status: 500 }
    );
  }
});
