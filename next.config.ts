import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Force tailwindcss to resolve from this project so it works when cwd is parent (e.g. Desktop).
const root = path.dirname(fileURLToPath(import.meta.url));
const tailwindPath = path.join(root, "node_modules", "tailwindcss");

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    resolveAlias: {
      tailwindcss: tailwindPath,
    },
  },
  webpack: (config) => {
    config.resolve ??= {};
    config.resolve.alias = { ...config.resolve.alias, tailwindcss: tailwindPath };
    return config;
  },
};

export default nextConfig;
