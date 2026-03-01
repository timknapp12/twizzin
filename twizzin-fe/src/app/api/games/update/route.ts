import { NextRequest, NextResponse } from 'next/server';
import { createAdminHandler } from '@/lib/auth';
import { updateGameWithQuestions } from '@/utils/supabase/updateGameToDb';
import { getGameById } from '@/utils/supabase/getGameFromDb';
import { QuestionForDb } from '@/types';

interface UpdateGameRequest {
  gameId: string;
  gameData: {
    name: string;
    entryFee: number;
    commissionBps: number;
    startTime: string;
    endTime: string;
    maxWinners: number;
    donationAmount: number;
    allAreWinners: boolean;
    evenSplit: boolean;
    username?: string;
    imgUrl?: string;
  };
  questions: QuestionForDb[];
  imageFile?: string; // Base64 encoded image
}

export const PUT = createAdminHandler(async (request: NextRequest, user) => {
  try {
    const body: UpdateGameRequest = await request.json();
    const { gameId, gameData, questions, imageFile } = body;

    // Validate required fields
    if (!gameId || !gameData || !questions) {
      return NextResponse.json(
        { error: 'Missing required fields: gameId, gameData, and questions' },
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
        { error: 'Unauthorized: You can only update games you created' },
        { status: 403 }
      );
    }

    // Check if game can still be updated (not started or completed)
    const now = new Date();
    const gameStartTime = new Date(game.start_time);
    
    if (now > gameStartTime && game.status === 'active') {
      return NextResponse.json(
        { error: 'Cannot update game that has already started' },
        { status: 400 }
      );
    }

    if (game.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot update completed game' },
        { status: 400 }
      );
    }

    // Convert base64 image to File if provided
    let imageFileObj: File | null = null;
    if (imageFile) {
      try {
        const base64Data = imageFile.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        imageFileObj = new File([byteArray], 'game-image.png', { type: 'image/png' });
      } catch (error) {
        console.error('Error processing image:', error);
        return NextResponse.json(
          { error: 'Invalid image format' },
          { status: 400 }
        );
      }
    }

    // Update the game
    const result = await updateGameWithQuestions(
      gameId,
      gameData,
      questions,
      imageFileObj
    );

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error: any) {
    console.error('Error updating game:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update game' },
      { status: 500 }
    );
  }
});