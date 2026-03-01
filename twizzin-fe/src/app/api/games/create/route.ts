import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedHandler } from '@/lib/auth';
import { createGameWithQuestions } from '@/utils/supabase/createGame';
import { GameInputForDb, QuestionForDb } from '@/types';

interface CreateGameRequest {
  gameData: Omit<GameInputForDb, 'adminWallet'>;
  questions: QuestionForDb[];
  imageFile?: string; // Base64 encoded image
}

export const POST = createAuthenticatedHandler(async (request: NextRequest, user) => {
  try {
    const body: CreateGameRequest = await request.json();
    const { gameData, questions, imageFile } = body;

    // Validate required fields
    if (!gameData.name || !questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: name and questions' },
        { status: 400 }
      );
    }

    // Add the authenticated user's wallet as admin
    const gameDataWithAdmin: GameInputForDb = {
      ...gameData,
      adminWallet: user.wallet_address,
    };

    // Convert base64 image to File if provided
    let imageFileObj: File | null = null;
    if (imageFile) {
      try {
        // Decode base64 and create File object
        const base64Data = imageFile.split(',')[1]; // Remove data:image/...;base64, prefix
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

    // Create the game
    const result = await createGameWithQuestions(
      gameDataWithAdmin,
      questions,
      imageFileObj
    );

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error: any) {
    console.error('Error creating game:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create game' },
      { status: 500 }
    );
  }
});