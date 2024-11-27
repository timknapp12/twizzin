/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
  // Add transpilePackages for wallet adapter packages
  transpilePackages: [
    '@solana/wallet-adapter-base',
    '@solana/wallet-adapter-react',
    '@solana/wallet-adapter-react-ui',
    '@solana/wallet-adapter-wallets',
    '@solana/wallet-adapter-phantom',
  ],
  // Disable server-side rendering for pages with wallet integration
  experimental: {
    // This allows better error handling during SSR
    missingSuspenseWithCSRError: false,
  },
};

export default nextConfig;
