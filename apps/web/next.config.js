/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@elearning/shared'],
  images: {
    domains: [
      'img.clerk.com',
      'images.clerk.dev',
      // R2 custom domain will be added here
    ],
  },
  // For Cloudflare Pages deployment
  output: 'standalone',
  experimental: {
    // Enable if using server actions
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

module.exports = nextConfig;
