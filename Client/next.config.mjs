/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack config (using webpack for now due to @uploadthing compatibility)
  turbopack: {
    root: ".",
  },
  
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "utfs.io",
      },
      {
        protocol: "https",
        hostname: "replicate.delivery",
      },
      {
        protocol: "https",
        hostname: "canva-clone-ali.vercel.app",
      },
    ],
  },

  // Server-side optimization - externalize client-only packages
  serverExternalPackages: [
    "@imgly/background-removal",
    "onnxruntime-node",
    "sharp",
  ],

  // Webpack configuration for handling onnxruntime-web
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Client-side: add fallbacks for Node.js modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        module: false,
      };
    }

    // Handle WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });

    return config;
  },
};

export default nextConfig;
