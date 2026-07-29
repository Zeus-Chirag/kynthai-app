/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable SWC minification for faster builds (already default in Next.js 15)
  swcMinify: true,

  // Compress responses with gzip
  compress: true,

  // Enable React strict mode for development
  reactStrictMode: true,

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [375, 640, 750, 1080, 1200, 1920],
  },

  // Experimental: optimize CSS, bundle analysis
  experimental: {
    optimizeCss: false, // Set to true if @next/bundle-analyzer is installed
    scrollRestoration: true,
  },

  // Production source maps (hidden in prod, available for error tracking)
  productionBrowserSourceMaps: false,

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
      {
        source: '/fonts/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
