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
  experimental: {
    serverComponentsExternalPackages: ["mammoth", "pdf-parse"],
  },
  webpack: (config, { isServer }) => {
    // Resolve the @/ alias to project root
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': '.',
    };
    return config;
  },
}

module.exports = nextConfig 