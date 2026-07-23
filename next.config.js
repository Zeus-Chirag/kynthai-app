/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Standalone output only for Docker/container deployments (use: node .next/standalone/server.js)
  // Comment out for standard "next start" usage

  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Hide Next.js version fingerprint from responses
  poweredByHeader: false,

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          // ponytail: HSTS omitted here — sending it over plain HTTP bricks the
          // origin in browsers (Safari caches the https upgrade, can't fall back).
          // Emitted only over TLS by proxy.ts.
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
          // COEP/COOP removed for Safari dev compatibility — re-enable in production build only
        ],
      },
    ];
  },

  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
  turbopack: {
    resolveAlias: {
      '@': './src',
    },
  },
};

// Bundle analyzer (run with ANALYZE=true npm run build)
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);