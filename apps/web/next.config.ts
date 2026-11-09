import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@meeteora/ui'],
  outputFileTracingRoot: path.join(import.meta.dirname, '../../'),
};

export default nextConfig;
