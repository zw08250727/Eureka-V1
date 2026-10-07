import path from "node:path";
import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  outputFileTracingRoot: path.resolve(__dirname),
  basePath,
  ...(process.env.EUREKA_LOW_MEMORY === "1"
    ? {
        experimental: { cpus: 1 },
        webpack: (config) => {
          config.cache = false;
          return config;
        },
      }
    : {}),
};

export default nextConfig;
