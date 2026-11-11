import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The JSON store lives on local disk; keep the server runtime on Node.
  serverExternalPackages: ["@anthropic-ai/sdk"],
};

export default nextConfig;
