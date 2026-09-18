import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control',   value: 'on' },
  { key: 'X-Content-Type-Options',   value: 'nosniff' },
  { key: 'X-Frame-Options',          value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',       value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  async redirects() {
    return [
      {
        source: '/contact-us',
        destination: '/contact',
        permanent: true,
      },
      {
        source: '/blog',
        destination: '/blogs',
        permanent: true,
      },
      {
        source: '/product/:slug*',
        destination: '/shop/:slug*',
        permanent: true,
      },
      {
        source: '/product-category/:path*',
        destination: '/shop',
        permanent: true,
      },
      {
        source: '/category/:path*',
        destination: '/shop',
        permanent: true,
      },
      {
        source: '/cart-2',
        destination: '/cart',
        permanent: true,
      },
      {
        source: '/checkout-2',
        destination: '/checkout',
        permanent: true,
      },
      {
        source: '/',
        has: [
          {
            type: 'query',
            key: 's',
          },
        ],
        destination: '/shop',
        permanent: true,
      },
    ];
  },
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  images: {
    // Serve images straight from R2 (already compressed to WebP on upload) instead
    // of routing through Vercel's optimizer, which returns 402 once the plan's
    // image-optimization quota is hit (OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED).
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-bc6e3f2948144094afe58ec3ca87bf45.r2.dev',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'drive.google.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'krissmaagiiccrystals.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
