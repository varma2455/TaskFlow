/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'lh3.googleusercontent.com',
      'api.dicebear.com',
      'avatars.githubusercontent.com',
    ],
  },
};

module.exports = nextConfig;
