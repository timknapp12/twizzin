import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedHandler } from '@/lib/auth';
import { supabaseServer } from '@/utils/supabase/supabaseServerClient';

export const GET = createAuthenticatedHandler(async (request: NextRequest, user) => {
  try {
    const { data, error } = await supabaseServer
      .from('games')
      .select(
        'id, game_code, name, created_at, status, image_url, entry_fee, token_mint, admin_wallet'
      )
      .eq('admin_wallet', user.wallet_address)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch creator games: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    console.error('Error fetching creator games:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch creator games' },
      { status: 500 }
    );
  }
});
