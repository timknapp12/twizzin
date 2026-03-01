import { NextRequest, NextResponse } from 'next/server';
import { createRateLimitedHandler } from '@/lib/rateLimit';
import { getPartialGameFromDb } from '@/utils/supabase/getGameFromDb';

// Rate limit: 60 requests per minute per IP for public access
const rateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60
};

export const GET = createRateLimitedHandler(
  rateLimitConfig,
  async (request: NextRequest) => {
    try {
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/');
      const gameCode = pathSegments[3]; // /api/games/[gameCode]/partial -> index 3

      if (!gameCode) {
        return NextResponse.json(
          { error: 'Game code is required' },
          { status: 400 }
        );
      }

      const partialGame = await getPartialGameFromDb(gameCode);

      if (!partialGame) {
        return NextResponse.json(
          { error: 'Game not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: partialGame,
      });

    } catch (error: any) {
      console.error('Error fetching partial game data:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch game data' },
        { status: 500 }
      );
    }
  }
);