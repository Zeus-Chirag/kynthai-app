/** @type {import('next').NextConfig} */
const nextConfig = {
  // Compress responses with gzip
  compress: true,

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [375, 640, 750, 1080, 1200, 1920],
    // Cache remote images for 60 days on CDN
    minimumCacheTTL: 60 * 60 * 24 * 60,
  },

  // React strict mode for development
  reactStrictMode: true,

  // Production source maps (hidden in prod, available for error tracking)
  productionBrowserSourceMaps: false,

  // Prevent OOM kills on Vercel free tier during static generation
  // by reducing concurrency and memory pressure. cpus caps the number of
  // page-data collection workers (defaults to host core count - 1).
  experimental: {
    cpus: 2,
    // Tell Turbopack to reduce memory usage during build
    optimizePackageImports: ['lucide-react', 'framer-motion', '@radix-ui/*', 'recharts', 'date-fns', 'cmdk'],
    // Optimize bundle size for server components
    optimizeServerReact: true,
  },

  // External packages that shouldn't be traced/bundled (fixes NFT warnings)
  serverExternalPackages: ['@prisma/client', 'bcryptjs', 'speakeasy', 'qrcode'],

  // Headers for performance and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      // Cache static assets aggressively (fonts, images, JS chunks with hash)
      {
        source: '/:path*.(svg|png|jpg|jpeg|gif|webp|avif|ico)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:path*.(js|css)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:path*.(woff|woff2|ttf|otf|eot)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:path*.(json)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
      // Prevent ad-blockers / extensions from blocking critical resources
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
