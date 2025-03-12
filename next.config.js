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
      config.externals = [...(config.externals || []), 
        'mammoth', 
        'pdf-parse'
      ];
    }

    return config;
  },
  // Optimize output for serverless deployment
  output: 'standalone',
}

module.exports = nextConfig 