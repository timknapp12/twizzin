import { NextRequest, NextResponse } from 'next/server';
import { createRateLimitedHandler } from '@/lib/rateLimit';
import { fetchGamePlayers } from '@/utils/supabase/fetchGamePlayers';

// Rate limit: 30 requests per minute per IP (more restrictive for player data)
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
      const gameCode = pathSegments[3]; // /api/games/[gameCode]/players -> index 3

      if (!gameCode) {
        return NextResponse.json(
          { error: 'Game code is required' },
          { status: 400 }
        );
      }

      const players = await fetchGamePlayers(gameCode);

      return NextResponse.json({
        success: true,
        data: players,
      });

    } catch (error: any) {
      console.error('Error fetching game players:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch game players' },
        { status: 500 }
      );
    }
  }
);