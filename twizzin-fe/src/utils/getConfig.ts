import { clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

interface NetworkConfig {
  endpoint: string;
  network: WalletAdapterNetwork;
}

export const NETWORK_CONFIGS = {
  devnet: {
    endpoint: clusterApiUrl('devnet'),
    network: WalletAdapterNetwork.Devnet,
  },
  mainnet: {
    endpoint: clusterApiUrl('mainnet-beta'),
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
