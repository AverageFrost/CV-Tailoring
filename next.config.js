/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ["mammoth", "pdf-parse"],
  webpack: (config, { isServer }) => {
    // Resolve the @/ alias to project root
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': '.',
    };

    // Optimize bundle size by excluding large dependencies from the bundle
    if (isServer) {
      // More aggressively externalize dependencies
      const originalExternals = [...(config.externals || [])];
      
      // Create a more comprehensive list of externals
      config.externals = [
        ...originalExternals,
        'mammoth', 
        'pdf-parse',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-scroll-area',
        '@radix-ui/react-tabs',
        '@radix-ui/react-tooltip',
        'framer-motion',
        'docx',
        'date-fns',
        'recharts',
        'next-themes',
        'embla-carousel-react',
        'react-day-picker',
        'zod',
        'class-variance-authority',
        'clsx',
        'tailwind-merge',
        'sonner',
        'vaul',
        // Add more to externalize
        '@anthropic-ai/sdk',
        'anthropic',
        'formidable',
        'fs-extra',
        'uuid',
        'critters',
        'prismic-javascript',
        // Externalize all node_modules
        function(context, request, callback) {
          if (request.startsWith('node_modules/') || 
              /node_modules[\\/]/.test(request) ||
              /^[^.\/]/.test(request)) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
      ];

      // Add a rule to reduce size by excluding source maps and unnecessary files
      config.optimization.minimize = true;
      config.optimization.minimizer = [
        ...config.optimization.minimizer || [],
        new (require('terser-webpack-plugin'))({
          terserOptions: {
            compress: true,
            mangle: true,
            output: {
              comments: false,
            },
          },
          extractComments: false,
        }),
      ];
    }

    // Add a rule to reduce bundle size by removing unnecessary files
    config.module.rules.push({
      test: /\.js$/,
      include: /node_modules/,
      exclude: /\.(d\.ts|map)$/,
    });

    // Minimize code size 
    if (config.optimization && isServer) {
      config.optimization.minimize = true;
    }

    return config;
  },
  
  // Move outputFileTracingRoot to top level as recommended in the error message
  outputFileTracingRoot: process.env.NODE_ENV === 'production' ? '.' : undefined,
  
  // Minimize the size of the build output
  experimental: {
    // Remove server code from client bundles
    optimizeCss: true,
    // Only include required polyfills
    optimizePackageImports: [
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      'lucide-react',
      'framer-motion',
      'date-fns',
      'recharts',
      'sonner',
      'vaul'
    ],
    // Disable features that increase bundle size
    serverMinification: true,
    serverSourceMaps: false,
    forceSwcTransforms: true,
    // Remove unsupported option
    nextScriptWorkers: true,
  }
}

module.exports = nextConfig 