/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/favicon.ico', destination: '/api/favicon?s=48' },
      { source: '/apple-touch-icon.png', destination: '/api/favicon?s=180' },
      { source: '/apple-touch-icon-precomposed.png', destination: '/api/favicon?s=180' },
      { source: '/icon-192.png', destination: '/api/favicon?s=192' },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.sanity.io' },
    ],
  },
};

module.exports = nextConfig;
