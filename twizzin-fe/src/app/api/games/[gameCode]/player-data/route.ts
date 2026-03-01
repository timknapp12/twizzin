import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedHandler } from '@/lib/auth';
import { fetchPlayerData } from '@/utils/supabase/fetchGamePlayers';

export const GET = createAuthenticatedHandler(async (request: NextRequest, user) => {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const gameCode = pathSegments[3]; // /api/games/[gameCode]/player-data -> index 3

    if (!gameCode) {
      return NextResponse.json(
        { error: 'Game code is required' },
        { status: 400 }
      );
    }

    // Fetch player data for the authenticated user
    const playerData = await fetchPlayerData(gameCode, user.wallet_address);

    return NextResponse.json({
      success: true,
      data: playerData,
    });

  } catch (error: any) {
    console.error('Error fetching player data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch player data' },
      { status: 500 }
    );
  }
});