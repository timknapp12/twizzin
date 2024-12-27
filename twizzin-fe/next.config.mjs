/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: true,
  },
  reactStrictMode: true,
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
  images: {
    domains: [
      'dygaclxomuoxsyyxdzht.supabase.co', // development/current
      'your-staging-project.supabase.co', // staging
      'your-production-project.supabase.co', // production
    ],
  },
};

export default nextConfig;
