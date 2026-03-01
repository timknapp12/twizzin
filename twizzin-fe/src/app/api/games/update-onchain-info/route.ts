import { NextRequest, NextResponse } from 'next/server';
import { createAdminHandler } from '@/lib/auth';
import { getGameById } from '@/utils/supabase/getGameFromDb';
import { supabaseServer } from '@/utils/supabase/supabaseServerClient';

interface UpdateOnchainInfoRequest {
  gameId: string;
  gamePubkey: string;
  answerMerkleRoot: number[] | string;
}

export const POST = createAdminHandler(async (request: NextRequest, user) => {
  try {
    const body: UpdateOnchainInfoRequest = await request.json();
    const { gameId, gamePubkey, answerMerkleRoot } = body;

    if (!gameId || !gamePubkey || !answerMerkleRoot) {
      return NextResponse.json(
        { error: 'Missing required fields: gameId, gamePubkey, and answerMerkleRoot' },
        { status: 400 }
      );
    }

    // Verify that the user is the admin of this game
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

    // Update the game with on-chain info
    const { error: updateError } = await supabaseServer
      .from('games')
      .update({
        game_pubkey: gamePubkey,
        answer_merkle_root: answerMerkleRoot,
      })
      .eq('id', gameId);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update on-chain info: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'On-chain info updated successfully',
        gameId,
      },
    });
  } catch (error: any) {
    console.error('Error updating on-chain info:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update on-chain info' },
      { status: 500 }
    );
  }
});
