import type { NextConfig } from "next";

/**
 * SONUS v4 — static export for GitHub Pages.
 *
 * Production publishes to https://dessbg0508.github.io/sonus-earth-machine/
 * so `next build` must emit a fully static `out/` with the /sonus-earth-machine
 * base path. In dev we drop the base path so the app also runs at "/".
 *
 * No server runtime features are used anywhere (no API routes, no SSR/ISR,
 * no middleware, unoptimized images): everything runs 100% in the client.
 */
const PROD_BASE = "/sonus-earth-machine";
const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isProd ? PROD_BASE : "",
  assetPrefix: isProd ? PROD_BASE : undefined,
  images: { unoptimized: true },
  reactStrictMode: false,
};

export default nextConfig;
