import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedHandler } from '@/lib/auth';
import { submitAnswersToDb } from '@/utils/supabase/submitAnswersToDb';
import { getGameFromDb } from '@/utils/supabase/getGameFromDb';
import { SubmitAnswersToDbParams } from '@/types';

interface SubmitAnswersRequest {
  gameCode: string;
  gameSession: SubmitAnswersToDbParams['gameSession'];
  signature: string;
  numCorrect: number;
}

export const POST = createAuthenticatedHandler(async (request: NextRequest, user) => {
  try {
    const body: SubmitAnswersRequest = await request.json();
    const { gameCode, gameSession, signature, numCorrect } = body;

    // Validate required fields
    if (!gameCode || !gameSession || !signature || numCorrect === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: gameCode, gameSession, signature, numCorrect' },
        { status: 400 }
      );
    }

    // Get the game to ensure it exists and get the game ID
    const game = await getGameFromDb(gameCode);
    
    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Note: Time validation is handled by the Solana program
    // The API just stores the data that was already validated on-chain

    // Validate answers array
    if (!gameSession.answers || !Array.isArray(gameSession.answers) || gameSession.answers.length === 0) {
      return NextResponse.json(
        { error: 'Invalid answers format' },
        { status: 400 }
      );
    }

    // Submit answers to database
    const result = await submitAnswersToDb({
      gameId: game.id,
      playerWallet: user.wallet_address,
      gameSession,
      signature,
      numCorrect,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to submit answers' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Answers submitted successfully',
        gameId: game.id,
        numCorrect,
      },
    });

  } catch (error: any) {
    console.error('Error submitting answers:', error);
    
    // Handle specific error cases
    if (error.message.includes('duplicate')) {
      return NextResponse.json(
        { error: 'Answers have already been submitted for this game' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to submit answers' },
      { status: 500 }
    );
  }
});