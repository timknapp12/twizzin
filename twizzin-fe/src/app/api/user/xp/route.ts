import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedHandler } from '@/lib/auth';
import { getUserXPLevel } from '@/utils';

export const GET = createAuthenticatedHandler(async (request: NextRequest, user) => {
  try {
    const xpData = await getUserXPLevel(user.wallet_address);

    return NextResponse.json({
      success: true,
      data: xpData,
    });

  } catch (error: any) {
    console.error('Error fetching user XP:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user XP data' },
      { status: 500 }
    );
  }
});