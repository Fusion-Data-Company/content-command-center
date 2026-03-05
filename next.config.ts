import type { NextConfig } from "next";

// In local dev, force .env.local to override stale shell env vars
if (!process.env.VERCEL) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { config } = require("dotenv");
  const { resolve } = require("path");
  config({ path: resolve(process.cwd(), ".env.local"), override: true });
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
