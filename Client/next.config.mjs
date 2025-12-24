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
    "fabric", // Fabric.js requires jsdom on server - externalize to avoid bundling issues
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
        jsdom: false, // Fabric.js tries to require jsdom on server, ignore on client
      };
    }

    if (isServer) {
      // Server-side: externalize fabric to prevent jsdom resolution issues
      config.externals = config.externals || [];
      config.externals.push({
        fabric: "commonjs fabric",
      });
    }

    // Handle WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });

    // Ignore jsdom - fabric.js tries to require it but we don't need it in browser
    config.resolve.alias = {
      ...config.resolve.alias,
      jsdom: false,
    };

    return config;
  },
};

export default nextConfig;
