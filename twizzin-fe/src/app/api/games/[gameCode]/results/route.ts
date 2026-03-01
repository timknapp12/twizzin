import { NextRequest, NextResponse } from 'next/server';
import { createRateLimitedHandler } from '@/lib/rateLimit';
import { fetchGameLeaderboard } from '@/utils/supabase/getGameResults';
import { getGameFromDb } from '@/utils/supabase/getGameFromDb';

// Rate limit: 30 requests per minute per IP
const rateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30
};

export const GET = createRateLimitedHandler(
  rateLimitConfig,
  async (request: NextRequest) => {
    try {
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/');
      const gameCode = pathSegments[3]; // /api/games/[gameCode]/results -> index 3

      if (!gameCode) {
        return NextResponse.json(
          { error: 'Game code is required' },
          { status: 400 }
        );
      }

      const game = await getGameFromDb(gameCode);

      if (!game) {
        return NextResponse.json(
          { error: 'Game not found' },
          { status: 404 }
        );
      }

      const results = await fetchGameLeaderboard(game.id);

      return NextResponse.json({
        success: true,
        data: results,
      });

    } catch (error: any) {
      console.error('Error fetching game results:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch game results' },
        { status: 500 }
      );
    }
  }
);
