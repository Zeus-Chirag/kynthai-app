/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Ensure Next.js 16 compatibility with Vercel
  // The Adapters API in Next.js 16.2 may conflict with Vercel's deployment
  // Pinning output ensures proper function exports
  output: undefined,

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
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
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

  // Disable Next.js telemetry
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

// Bundle analyzer (run with ANALYZE=true npm run build)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);
