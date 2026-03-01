import { clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

interface NetworkConfig {
  endpoint: string;
  network: WalletAdapterNetwork;
}

/**
 * Returns the RPC endpoint URL.
 *
 * Priority:
 *  1. `/api/rpc` proxy — keeps the Helius API key server-side only.
 *     This only works in the browser (same-origin fetch). During SSR or
 *     when running outside the browser we fall through to option 2.
 *  2. Direct Helius URL via server-only HELIUS_API_KEY — used during SSR/build
 *     when the proxy isn't available (server-to-server, no client exposure).
 *  3. Solana public clusterApiUrl as a last resort.
 */
function getRpcEndpoint(isDevnet: boolean): string {
  // In the browser, use the server-side proxy so the API key is never exposed.
  if (typeof window !== 'undefined') {
    return '/api/rpc';
  }

  // Outside the browser (SSR / build), fall back to direct Helius URL if available.
  // Uses server-only HELIUS_API_KEY (no NEXT_PUBLIC_ prefix) to avoid client exposure.
  if (process.env.HELIUS_API_KEY) {
    return `https://${
      isDevnet ? 'devnet' : 'mainnet'
    }.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
  }

  // Last resort: Solana public RPC (rate-limited).
  return clusterApiUrl(isDevnet ? 'devnet' : 'mainnet-beta');
}

const isDevnet = process.env.NEXT_PUBLIC_ENVIRONMENT !== 'mainnet';

export const NETWORK_CONFIGS = {
  devnet: {
    endpoint: getRpcEndpoint(true),
    network: WalletAdapterNetwork.Devnet,
  },
  mainnet: {
    endpoint: getRpcEndpoint(false),
    network: WalletAdapterNetwork.Mainnet,
  },
} as const;

// Get current network configuration based on environment
export const getCurrentConfig = (): NetworkConfig => {
  const isProduction = process.env.NEXT_PUBLIC_ENVIRONMENT === 'mainnet';
  return NETWORK_CONFIGS[isProduction ? 'mainnet' : 'devnet'];
};

export const isDev = (): boolean => {
  return process.env.NEXT_PUBLIC_ENVIRONMENT !== 'mainnet';
};
