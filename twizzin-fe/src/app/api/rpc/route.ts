import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';

// Whitelist of allowed JSON-RPC methods.
// Only standard read/write Solana methods are permitted.
const ALLOWED_METHODS = new Set([
  // Account & balance queries
  'getAccountInfo',
  'getBalance',
  'getMultipleAccounts',
  'getProgramAccounts',
  'getTokenAccountBalance',
  'getTokenAccountsByDelegate',
  'getTokenAccountsByOwner',
  'getTokenLargestAccounts',
  'getTokenSupply',
  // Block & slot queries
  'getBlock',
  'getBlockHeight',
  'getBlockProduction',
  'getBlockCommitment',
  'getBlocks',
  'getBlocksWithLimit',
  'getBlockTime',
  'getSlot',
  'getSlotLeader',
  'getSlotLeaders',
  // Transaction queries
  'getTransaction',
  'getSignaturesForAddress',
  'getSignatureStatuses',
  'getRecentBlockhash',
  'getLatestBlockhash',
  'getFeeForMessage',
  'getMinimumBalanceForRentExemption',
  'isBlockhashValid',
  // Transaction submission
  'sendTransaction',
  'simulateTransaction',
  // Cluster info
  'getClusterNodes',
  'getEpochInfo',
  'getEpochSchedule',
  'getGenesisHash',
  'getHealth',
  'getIdentity',
  'getInflationGovernor',
  'getInflationRate',
  'getInflationReward',
  'getLargestAccounts',
  'getLeaderSchedule',
  'getRecentPerformanceSamples',
  'getStakeMinimumDelegation',
  'getSupply',
  'getVersion',
  'getVoteAccounts',
  // Subscription-related (stateless queries)
  'minimumLedgerSlot',
]);

// Methods that should be blocked in production
const BLOCKED_IN_PRODUCTION = new Set(['requestAirdrop']);

// Rate limit: 60 requests per 10 seconds per IP for RPC proxy
const RPC_RATE_LIMIT = { windowMs: 10_000, maxRequests: 60 };

export async function POST(request: NextRequest) {
  // --- Rate limiting ---
  const rateLimitResult = await rateLimit(request, RPC_RATE_LIMIT);
  if (rateLimitResult) {
    return rateLimitResult; // 429 response
  }

  // --- Validate Helius API key is configured server-side ---
  const heliusApiKey = process.env.HELIUS_API_KEY;
  if (!heliusApiKey) {
    return NextResponse.json(
      { error: 'RPC proxy is not configured. Missing HELIUS_API_KEY.' },
      { status: 503 }
    );
  }

  // --- Parse request body ---
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  // Support both single requests and batch requests
  const isBatch = Array.isArray(body);
  const requests = isBatch ? body : [body];

  // --- Validate each RPC method ---
  const isProduction = process.env.NEXT_PUBLIC_ENVIRONMENT === 'mainnet';

  for (const req of requests) {
    const method = req?.method;
    if (!method || typeof method !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid JSON-RPC method' },
        { status: 400 }
      );
    }

    if (!ALLOWED_METHODS.has(method)) {
      return NextResponse.json(
        {
          error: `Method "${method}" is not allowed through the RPC proxy`,
        },
        { status: 403 }
      );
    }

    if (isProduction && BLOCKED_IN_PRODUCTION.has(method)) {
      return NextResponse.json(
        {
          error: `Method "${method}" is not available in production`,
        },
        { status: 403 }
      );
    }
  }

  // --- Determine the upstream Helius RPC URL ---
  const isDevnet = process.env.NEXT_PUBLIC_ENVIRONMENT === 'devnet';
  const heliusUrl = `https://${
    isDevnet ? 'devnet' : 'mainnet'
  }.helius-rpc.com/?api-key=${heliusApiKey}`;

  // --- Forward the request ---
  try {
    const upstream = await fetch(heliusUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await upstream.json();

    return NextResponse.json(data, {
      status: upstream.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    console.error('RPC proxy upstream error:', err);
    return NextResponse.json(
      { error: 'Failed to reach upstream RPC provider' },
      { status: 502 }
    );
  }
}
