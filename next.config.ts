import type { NextConfig } from "next";
import { config } from "dotenv";
import { resolve } from "path";

// Force .env.local to override any stale system env vars
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
