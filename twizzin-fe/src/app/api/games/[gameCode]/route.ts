import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedHandler } from '@/lib/auth';
import { getGameForPlayer } from '@/utils/supabase/getGameFromDb';

export const GET = createAuthenticatedHandler(async (request: NextRequest, user) => {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const gameCode = pathSegments[3]; // /api/games/[gameCode] -> index 3

    if (!gameCode) {
      return NextResponse.json(
        { error: 'Game code is required' },
        { status: 400 }
      );
    }

    const game = await getGameForPlayer(gameCode);

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: game,
    });

  } catch (error: any) {
    console.error('Error fetching game:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch game' },
      { status: 500 }
    );
  }
});
