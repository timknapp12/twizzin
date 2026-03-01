import { NextRequest, NextResponse } from 'next/server';
import { createRateLimitedHandler } from '@/lib/rateLimit';
import { fetchCompleteGameResults } from '@/utils/supabase/getGameResults';
import { getGameFromDb } from '@/utils/supabase/getGameFromDb';

// Rate limit: 10 requests per minute per IP (more restrictive for complete results)
const rateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10
};

export const GET = createRateLimitedHandler(
  rateLimitConfig,
  async (request: NextRequest) => {
    try {
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/');
      const gameCode = pathSegments[3]; // /api/games/[gameCode]/complete-results -> index 3
      const playerWallet = url.searchParams.get('playerWallet');

      if (!gameCode) {
        return NextResponse.json(
          { error: 'Game code is required' },
          { status: 400 }
        );
      }

      // First get the game to get the game ID
      const game = await getGameFromDb(gameCode);
      
      if (!game) {
        return NextResponse.json(
          { error: 'Game not found' },
          { status: 404 }
        );
      }

      // Only allow fetching complete results for completed games
      if (game.status !== 'completed') {
        return NextResponse.json(
          { error: 'Complete results only available for finished games' },
          { status: 400 }
        );
      }

      const results = await fetchCompleteGameResults(
        game.id,
        gameCode,
        playerWallet || undefined
      );

      return NextResponse.json({
        success: true,
        data: results,
      });

    } catch (error: any) {
      console.error('Error fetching complete game results:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch complete game results' },
        { status: 500 }
      );
    }
  }
);