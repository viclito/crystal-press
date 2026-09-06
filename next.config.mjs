/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@tanstack/react-query",
    "@tanstack/react-virtual",
    "lucide-react",
    "framer-motion",
    "qrcode.react",
  ],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
