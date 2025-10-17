/**
 * Webpack configuration for source code protection
 */

const TerserPlugin = require('terser-webpack-plugin');

const webpackConfig = (config, { dev, isServer }) => {
  // Production optimizations only
  if (!dev) {
    // Minimize and obfuscate code
    config.optimization = {
      ...config.optimization,
      minimize: true,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: true, // Remove console.log in production
              drop_debugger: true, // Remove debugger statements
              pure_funcs: ['console.log', 'console.info', 'console.debug'], // Remove specific functions
              passes: 3, // Multiple compression passes
            },
            mangle: {
              toplevel: true, // Mangle top-level names
              eval: true, // Mangle names in eval
              keep_classnames: false, // Don't preserve class names
              keep_fnames: false, // Don't preserve function names
              properties: {
                regex: /^_/ // Mangle properties starting with _
              }
            },
            format: {
              comments: false, // Remove all comments
              ascii_only: true, // Ensure ASCII output
            },
          },
          extractComments: false, // Don't extract comments to separate file
        }),
      ],
    };

    // Additional obfuscation for client-side code
    if (!isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        chunks: 'all',
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            minSize: 0,
            maxSize: 244000, // Split large chunks
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            enforce: true,
            minSize: 0,
          }
        },
      };
    }

    // Remove source maps in production
    config.devtool = false;
  }

  // Security headers and optimizations
  config.resolve.alias = {
    ...config.resolve.alias,
    // Add security-focused aliases if needed
  };

  return config;
};

module.exports = { webpackConfig };