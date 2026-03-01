import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/utils/supabase/supabaseServerClient';
import { getGameFromDb } from '@/utils/supabase/getGameFromDb';
import jwt from 'jsonwebtoken';

export interface AuthenticatedUser {
  id: string;
  wallet_address: string;
  email?: string;
}

export type AuthenticatedHandler = (
  // eslint-disable-next-line no-unused-vars
  request: NextRequest,
  // eslint-disable-next-line no-unused-vars
  user: AuthenticatedUser
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => Promise<NextResponse<any>>;

export async function verifyAuthToken(request: NextRequest): Promise<{
  user: AuthenticatedUser | null;
  error: string | null;
}> {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        user: null,
        error: 'Missing or invalid authorization header',
      };
    }

    const token = authHeader.substring(7);

    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    let user;

    if (jwtSecret) {
      // Primary path: manual JWT verification with secret
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const verifyOptions: jwt.VerifyOptions = {};

      if (supabaseUrl) {
        // Supabase JWTs use the project URL as the issuer
        verifyOptions.issuer = `${supabaseUrl}/auth/v1`;
      }

      // If jwt.verify throws (expired, malformed, bad signature, wrong issuer),
      // we do NOT fall through -- the token is definitively rejected.
      const decoded = jwt.verify(token, jwtSecret, verifyOptions) as any;

      user = {
        id: decoded.sub,
        user_metadata: decoded.user_metadata || {},
        app_metadata: decoded.app_metadata || {},
        email: decoded.email,
      };
    } else {
      // Fallback: SUPABASE_JWT_SECRET is not configured.
      // Use the Supabase server client to validate the token.
      console.warn(
        'SUPABASE_JWT_SECRET is not set. Falling back to supabaseServer.auth.getUser() for token verification. ' +
          'Set SUPABASE_JWT_SECRET for faster, local JWT verification.'
      );

      const { data, error: supabaseError } =
        await supabaseServer.auth.getUser(token);

      if (supabaseError || !data.user) {
        return {
          user: null,
          error: supabaseError?.message || 'Invalid token',
        };
      }

      user = data.user;
    }

    // Extract wallet address from user metadata
    const walletAddress =
      user.user_metadata?.custom_claims?.address ||
      user.user_metadata?.wallet_address ||
      user.app_metadata?.wallet_address;

    if (!walletAddress) {
      return {
        user: null,
        error: 'No wallet address found in user metadata',
      };
    }

    return {
      user: {
        id: user.id,
        wallet_address: walletAddress,
        email: user.email,
      },
      error: null,
    };
  } catch (error: any) {
    return {
      user: null,
      error: error.message || 'Authentication failed',
    };
  }
}

// eslint-disable-next-line no-unused-vars
export function createAuthenticatedHandler<_T = any>(
  handler: AuthenticatedHandler
) {
  return async (
    request: NextRequest
  ): Promise<NextResponse> => {
    const { user, error } = await verifyAuthToken(request);

    if (error || !user) {
      return NextResponse.json(
        { error: error || 'Authentication required' },
        { status: 401 }
      );
    }

    return handler(request, user);
  };
}

export function createAdminHandler(
  handler: AuthenticatedHandler,
  getGameId?: (
    // eslint-disable-next-line no-unused-vars
    request: NextRequest
  ) => Promise<string | null>
) {
  return async (
    request: NextRequest
  ): Promise<NextResponse> => {
    const { user, error } = await verifyAuthToken(request);

    if (error || !user) {
      return NextResponse.json(
        { error: error || 'Authentication required' },
        { status: 401 }
      );
    }

    // If a getGameId extractor is provided, verify admin ownership centrally
    if (getGameId) {
      const gameId = await getGameId(request);

      if (!gameId) {
        return NextResponse.json(
          { error: 'Missing game identifier' },
          { status: 400 }
        );
      }

      const game = await getGameFromDb(gameId);

      if (!game) {
        return NextResponse.json(
          { error: 'Game not found' },
          { status: 404 }
        );
      }

      if (game.admin_wallet !== user.wallet_address) {
        return NextResponse.json(
          { error: 'Unauthorized: You are not the admin of this game' },
          { status: 403 }
        );
      }
    }

    return handler(request, user);
  };
}

export async function getServerSideUser() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Use getUser() instead of getSession() for proper server-side JWT validation.
    // getSession() reads from cookies/storage without verifying the JWT,
    // making it unsuitable for server-side auth checks.
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    const walletAddress =
      user.user_metadata?.custom_claims?.address ||
      user.user_metadata?.wallet_address ||
      user.app_metadata?.wallet_address;

    if (!walletAddress) {
      return null;
    }

    return {
      id: user.id,
      wallet_address: walletAddress,
      email: user.email,
    };
  } catch (error) {
    console.error('Error getting server-side user:', error);
    return null;
  }
}
