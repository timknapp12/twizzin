import { NextRequest, NextResponse } from 'next/server';
import { createAdminHandler } from '@/lib/auth';
import { getGameById } from '@/utils/supabase/getGameFromDb';
import { supabaseServer } from '@/utils/supabase/supabaseServerClient';
import { fetchGameLeaderboard } from '@/utils/supabase/getGameResults';

interface AdminResultsRequest {
  gameId: string;
}

export const POST = createAdminHandler(async (request: NextRequest, user) => {
  try {
    const body: AdminResultsRequest = await request.json();
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
        { error: 'Unauthorized: You can only view results for games you created' },
        { status: 403 }
      );
    }

    // Fetch game data and leaderboard in parallel
    const [gameDataResult, leaderboardResults] = await Promise.all([
      supabaseServer
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single()
        .then(({ data }) => data),
      fetchGameLeaderboard(gameId),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        gameData: gameDataResult,
        leaderboard: leaderboardResults,
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin results:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch admin results' },
      { status: 500 }
    );
  }
});
