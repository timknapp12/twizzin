import { NextRequest, NextResponse } from 'next/server';
import { createAdminHandler } from '@/lib/auth';
import { getGameById } from '@/utils/supabase/getGameFromDb';
import { fetchGameSubmissions, determineWinnersAndLeaderboard } from '@/utils/supabase/getGameResults';

interface GameSubmissionsRequest {
  gameId: string;
  maxWinners: number;
  allAreWinners: boolean;
}

export const POST = createAdminHandler(async (request: NextRequest, user) => {
  try {
    const body: GameSubmissionsRequest = await request.json();
    const { gameId, maxWinners, allAreWinners } = body;

    if (!gameId || maxWinners === undefined || allAreWinners === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: gameId, maxWinners, and allAreWinners' },
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
        { error: 'Unauthorized: You can only view submissions for games you created' },
        { status: 403 }
      );
    }

    // Fetch submissions and determine winners
    const submissions = await fetchGameSubmissions(gameId);
    const gameResults = determineWinnersAndLeaderboard(
      submissions,
      maxWinners,
      allAreWinners
    );

    return NextResponse.json({
      success: true,
      data: gameResults,
    });
  } catch (error: any) {
    console.error('Error fetching game submissions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch game submissions' },
      { status: 500 }
    );
  }
});
