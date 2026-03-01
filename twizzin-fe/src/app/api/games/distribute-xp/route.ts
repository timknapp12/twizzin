import { NextRequest, NextResponse } from 'next/server';
import { createAdminHandler } from '@/lib/auth';
import { distributeGameXP } from '@/utils/supabase/xp';
import { getGameById } from '@/utils/supabase/getGameFromDb';
import { PlayerResult, XPDistributionConfig } from '@/types';

interface DistributeXPRequest {
  gameId: string;
  players: PlayerResult[];
  isEvenSplit: boolean;
  playerLength: number;
  config?: XPDistributionConfig;
}

export const POST = createAdminHandler(async (request: NextRequest, user) => {
  try {
    const body: DistributeXPRequest = await request.json();
    const { gameId, players, isEvenSplit, playerLength, config } = body;

    // Validate required fields
    if (!gameId || !players || !Array.isArray(players) || playerLength === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: gameId, players, and playerLength' },
        { status: 400 }
      );
    }

    // First, verify that the user is the admin of this game
    const game = await getGameById(gameId);
    
    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    if (game.admin_wallet !== user.wallet_address) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only distribute XP for games you created' },
        { status: 403 }
      );
    }

    // Validate that the game is in a state where XP can be distributed
    if (game.status !== 'completed' && game.status !== 'ended') {
      return NextResponse.json(
        { error: 'XP can only be distributed for completed or ended games' },
        { status: 400 }
      );
    }

    // Validate players data structure
    for (const player of players) {
      if (!player.wallet || player.numCorrect === undefined || player.rank === undefined) {
        return NextResponse.json(
          { error: 'Invalid player data structure' },
          { status: 400 }
        );
      }
    }

    // Distribute XP
    await distributeGameXP(
      game.id,
      players,
      isEvenSplit,
      user.wallet_address,
      playerLength,
      config
    );

    return NextResponse.json({
      success: true,
      data: {
        message: 'XP distributed successfully',
        gameId: game.id,
        playersCount: players.length,
        adminXP: playerLength * 10, // XP_PER_PLAYER constant
      },
    });

  } catch (error: any) {
    console.error('Error distributing XP:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to distribute XP' },
      { status: 500 }
    );
  }
});