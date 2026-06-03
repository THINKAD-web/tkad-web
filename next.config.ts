import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  fallbacks: {
    document: "/offline",
  },
  /** 정적 자산 SWR, API NetworkFirst */
  runtimeCaching: require("./config/pwa-runtime-caching.cjs"),
  importScripts: ["/sw-push.js"],
  buildExcludes: [/middleware-manifest\.json$/],
});

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** Turbopack must not use a parent folder (e.g. ~/) that has another package-lock.json as the workspace root. */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  /** jsPDF/pptxgenjs — Node 네이티브 의존성; Turbopack 번들 시 resolve 오류 방지 */
  serverExternalPackages: ["pptxgenjs", "jszip"],
  /**
   * Vercel 8GB builders: webpack compile + `tsc` in one process often hits the 45m
   * build limit (logs stop at "Running TypeScript …"). Typecheck locally / in CI via
   * `npm run typecheck`.
   */
  typescript: {
    ignoreBuildErrors: process.env.VERCEL === "1",
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "tkad-web.vercel.app" }],
        destination: "https://app.tkad.co.kr/:path*",
        permanent: true,
      },
      {
        source: "/:locale(ko|en)/guarantee/guarante",
        destination: "/:locale/guarantee",
        permanent: true,
      },
      {
        source: "/guarantee/guarante",
        destination: "/guarantee",
        permanent: true,
      },
    ];
  },
  /** 개발 모드 상단 Next 이슈 인디케이터(예: “N Issue”) 비활성화 — 운영 빌드에는 영향 없음 */
  devIndicators: false,
  turbopack: {
    root: projectRoot,
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.b-cdn.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "fastly.picsum.photos",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
    formats: ["image/webp", "image/avif"],
    qualities: [75, 85],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
    /** Vercel 2-core builders: lower peak RSS during webpack compile */
    webpackMemoryOptimizations: true,
  },
  webpack(config, { dev, isServer }) {
    config.resolve ??= {};
    config.resolve.alias ??= {};
    const alias = config.resolve.alias as Record<string, string>;
    // Home `~/package.json` shadowing: always resolve tailwind from this repo
    alias.tailwindcss = path.join(projectRoot, "node_modules/tailwindcss");

    if (!dev) {
      config.parallelism = 1;
    }

    if (!dev && !isServer) {
      if (Array.isArray(config.optimization?.minimizer)) {
        const [jsOnly] = config.optimization.minimizer;
        if (jsOnly) config.optimization.minimizer = [jsOnly];
      }
    }
    return config;
  },
};

/**
 * next-pwa webpack hooks break PostCSS/Tailwind in `next dev` — apply only for production builds.
 * On Vercel, skip PWA: webpack + Workbox on 2-core builders routinely hits the 45m build limit.
 */
const usePwa =
  process.env.NODE_ENV === "production" &&
  process.env.VERCEL !== "1" &&
  process.env.ENABLE_PWA !== "0";

const productionConfig = usePwa ? withPWA(nextConfig) : nextConfig;

export default process.env.NODE_ENV === "production"
  ? withNextIntl(productionConfig)
  : withNextIntl(nextConfig);
