import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedHandler } from '@/lib/auth';
import { recordPlayerJoinGame } from '@/utils/supabase/playerJoinGame';
import { getGameFromDb, getGameForPlayer } from '@/utils/supabase/getGameFromDb';

interface JoinGameRequest {
  gameCode: string;
  username?: string;
}

export const POST = createAuthenticatedHandler(async (request: NextRequest, user) => {
  try {
    const body: JoinGameRequest = await request.json();
    const { gameCode, username } = body;

    // Validate required fields
    if (!gameCode) {
      return NextResponse.json(
        { error: 'Game code is required' },
        { status: 400 }
      );
    }

    // First, get the game to ensure it exists and get the game ID
    const game = await getGameFromDb(gameCode);
    
    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Check if game is still accepting players
    const now = new Date();
    const gameStartTime = new Date(game.start_time);
    
    if (now > gameStartTime && game.status === 'active') {
      return NextResponse.json(
        { error: 'Game has already started' },
        { status: 400 }
      );
    }

    if (game.status === 'completed') {
      return NextResponse.json(
        { error: 'Game has already ended' },
        { status: 400 }
      );
    }

    // Record the player joining the game
    const result = await recordPlayerJoinGame(
      game.id,
      user.wallet_address,
      username
    );

    // Return player-safe game data (correct answers stripped)
    const safeGame = await getGameForPlayer(gameCode);

    return NextResponse.json({
      success: true,
      data: {
        game: safeGame,
        playerGameId: result.playerGameId,
        message: result.message,
      },
    });

  } catch (error: any) {
    console.error('Error joining game:', error);
    
    // Handle specific error cases
    if (error.message.includes('already joined')) {
      return NextResponse.json(
        { error: 'You have already joined this game' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to join game' },
      { status: 500 }
    );
  }
});