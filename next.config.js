/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { allowedOrigins: ['*'] },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_ATTRIBUTION_BASE_URL: process.env.NEXT_PUBLIC_ATTRIBUTION_BASE_URL,
    NEXT_PUBLIC_PARTNER_API_KEY: process.env.NEXT_PUBLIC_PARTNER_API_KEY,
  },
};
module.exports = nextConfig;
