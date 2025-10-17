import type {NextConfig} from 'next';
import { webpackConfig } from './webpack.security.js';

const nextConfig: NextConfig = {
  /* config options here */
  
  // 🔒 Security: Disable source maps in production to prevent source code exposure
  productionBrowserSourceMaps: false,
  
  // 🔒 Security: Strict mode for better error catching
  reactStrictMode: true,
  
  // 🔒 Security: Minimize exposed information
  poweredByHeader: false,
  
  // 🔒 Security: Enable experimental features for better security and performance
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },

  // 🔒 Security: Custom webpack configuration for code obfuscation
  // webpack: webpackConfig,

  // 🔥 Firebase Fix: Webpack configuration to prevent bundle splitting issues
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Prevent Firebase from being split into chunks
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          firebase: {
            test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
            name: 'firebase',
            chunks: 'all',
            priority: 30,
          },
        },
      };
    }
    return config;
  },

  // ⚡ Performance: Optimize bundle splitting
  onDemandEntries: {
    maxInactiveAge: 60 * 1000, // Keep pages in memory for 1 minute
    pagesBufferLength: 5, // Number of pages to keep in memory
  },

  // 🔒 Security: Compiler options
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Keep error and warn logs
    } : false,
  },

  // ⚡ Performance: Output optimization
  output: 'standalone',
  
  // 🔒 Security: Enhanced headers for production security
  async headers() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    const baseHeaders = [
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on'
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff'
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block'
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin'
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()'
      },
    ];

    // Add stricter security headers only in production
    const productionHeaders = [
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload'
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY'
      },
    ];

    return [
      {
        source: '/:path*',
        headers: [
          ...baseHeaders,
          ...(isDevelopment ? [] : productionHeaders),
          // Only add CSP in production to avoid development issues
          ...(isDevelopment ? [] : [{
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://accounts.google.com https://*.firebaseapp.com; style-src 'self' 'unsafe-inline' https://accounts.google.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.googleapis.com https://*.firebaseapp.com https://*.firebaseio.com https://accounts.google.com; frame-src https://accounts.google.com https://*.firebaseapp.com;"
          }])
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate'
          }
        ],
      },
    ];
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'hobiverse.com.vn',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
