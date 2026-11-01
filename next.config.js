/** @type {import('next').NextConfig} */
// Baseline hardening for every response. No CSP yet: YouTube embeds, Sanity
// Studio and the inline splash script would each need allowances, so it
// is safer added once the custom domain is settled.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
];

const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
    ];
  },
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
