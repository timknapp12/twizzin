import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedHandler } from '@/lib/auth';
import { getPlayerDataWithRewards } from '@/utils/supabase/getUserProfile';

export const GET = createAuthenticatedHandler(async (request: NextRequest, user) => {
  try {
    const profile = await getPlayerDataWithRewards(user.wallet_address);

    return NextResponse.json({
      success: true,
      data: profile,
    });

  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
});