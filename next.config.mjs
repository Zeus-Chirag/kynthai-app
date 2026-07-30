/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [375, 640, 750, 1080, 1200, 1920],
  },

  // React strict mode for development
  reactStrictMode: true,

  // Production source maps (hidden in prod, available for error tracking)
  productionBrowserSourceMaps: false,

  // Prevent OOM kills on Vercel free tier during static generation
  // by reducing concurrency and memory pressure
  experimental: {
    // Tell Turbopack to reduce memory usage during build
    optimizePackageImports: ['lucide-react', 'framer-motion', '@radix-ui/*'],
    // Prune large trace trees that cause NFT warnings
    turbo: {
      resolveAlias: {
        // Avoid tracing the entire project
      },
    },
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
        ],
      },
    ];
  },
};

export default nextConfig;
