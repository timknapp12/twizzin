import { clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

interface NetworkConfig {
  endpoint: string;
  network: WalletAdapterNetwork;
}

export const NETWORK_CONFIGS = {
  devnet: {
    endpoint: process.env.NEXT_PUBLIC_HELIUS_API_KEY
      ? `https://devnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`
      : clusterApiUrl('devnet'),
    network: WalletAdapterNetwork.Devnet,
  },
  mainnet: {
    endpoint: process.env.NEXT_PUBLIC_HELIUS_API_KEY
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`
      : clusterApiUrl('mainnet-beta'),
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
