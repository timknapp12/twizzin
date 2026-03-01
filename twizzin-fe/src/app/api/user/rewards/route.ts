import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedHandler } from '@/lib/auth';
import { getPlayerDataWithRewards } from '@/utils/supabase/getUserProfile';

export const GET = createAuthenticatedHandler<any>(
  async (request: NextRequest, user) => {
    void request;
    try {
      const playerData = await getPlayerDataWithRewards(user.wallet_address);

      if (!playerData) {
        return NextResponse.json({
          success: true,
          data: {
            player: null,
            games: [],
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: playerData,
      });
    } catch (error: any) {
      console.error('Error fetching player rewards:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch player rewards' },
        { status: 500 }
      );
    }
  }
);
