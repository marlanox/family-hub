/** @type {import('next').NextConfig} */
const isGithubPages = process.env.DEPLOY_TARGET === "github-pages";

// GitHub Pages serves this project at https://marlanox.github.io/family-hub/,
// so every asset/link needs that prefix. Local dev and any other host
// (Vercel, a custom domain, …) run with DEPLOY_TARGET unset and get "/".
const basePath = isGithubPages ? "/family-hub" : "";

const nextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

module.exports = nextConfig;
