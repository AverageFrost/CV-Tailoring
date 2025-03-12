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
        'vaul'
      ];
    }

    // Add a rule to reduce bundle size by removing unnecessary files
    config.module.rules.push({
      test: /\.js$/,
      include: /node_modules/,
      exclude: /\.(d\.ts|map)$/,
    });

    return config;
  },
  // Optimize output for serverless deployment
  output: 'standalone',
  
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
    ]
  }
}

module.exports = nextConfig 