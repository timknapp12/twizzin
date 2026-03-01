import { NextRequest, NextResponse } from 'next/server';
import { createAdminHandler } from '@/lib/auth';
import { supabaseServer } from '@/utils/supabase/supabaseServerClient';

export const POST = createAdminHandler(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    const { gameId } = body;

    if (!gameId) {
      return NextResponse.json(
        { error: 'Missing required field: gameId' },
        { status: 400 }
      );
    }

    const { data: gameData, error: gameError } = await supabaseServer
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError) {
      return NextResponse.json(
        { error: `Failed to fetch game data: ${gameError.message}` },
        { status: 500 }
      );
    }

    if (!gameData) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Verify that the user is the admin of this game
    if (gameData.admin_wallet !== user.wallet_address) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only view games you created' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: gameData,
    });
  } catch (error: any) {
    console.error('Error fetching game by ID:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch game' },
      { status: 500 }
    );
  }
});
