/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.salesforce.com',
      },
      {
        protocol: 'https',
        hostname: '**.force.com',
      },
    ],
  },
};

export default nextConfig;
