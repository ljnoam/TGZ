/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Désactive l’indicateur de build (le rond “N”) en mode développement
  devIndicators: {
    buildActivity: false,
  },
};

export default nextConfig;
