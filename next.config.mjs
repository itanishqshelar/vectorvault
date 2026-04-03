/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdf-parse'],
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
  },
  generateBuildId: async () => 'build',
  outputFileTracingExcludes: {
    '*': ['**/.next/dev/trace'],
  },
};

export default nextConfig;
