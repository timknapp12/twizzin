/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
      bodySizeLimit: '2mb',
    },
  },
  reactStrictMode: true,
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
  images: {
    domains: [
      'dygaclxomuoxsyyxdzht.supabase.co', // development/current
      'pmtjwqqfkqzbxxxurbqk.supabase.co', // staging
      'your-production-project.supabase.co', // production
    ],
  },
};

export default nextConfig;
