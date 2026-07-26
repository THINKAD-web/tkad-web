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
      // Performance guarantee policy retired (2026-07) — keep permanent redirects.
      {
        source: "/:locale(ko|en)/guarantee",
        destination: "/:locale/about",
        permanent: true,
      },
      {
        source: "/:locale(ko|en)/guarantee/:path*",
        destination: "/:locale/about",
        permanent: true,
      },
      {
        source: "/guarantee",
        destination: "/about",
        permanent: true,
      },
      {
        source: "/guarantee/:path*",
        destination: "/about",
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
    formats: ["image/avif"],
    qualities: [75, 85],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
    /** Vercel 2-core builders: lower peak RSS during webpack compile */
    webpackMemoryOptimizations: true,
    /**
     * 정적 페이지 생성 워커 수. Next 16 기본값은 "최소 4 워커"를 강제하는데,
     * 각 워커가 NODE_OPTIONS(--max-old-space-size)를 상속해 8GB Vercel 빌더에서
     * OOM(SIGKILL)을 유발한다. Vercel 에서는 1 워커로 고정해 피크 RSS 를 낮춘다.
     * (vercel-build heap 3584MB × 1 worker + webpack ≈ 8GB 한도 내)
     */
    cpus: process.env.VERCEL === "1" ? 1 : undefined,
  },
  /** postinstall 한글 TTF — 서버리스 함수 번들에 포함 (CDN 폴백 전 로컬 우선) */
  outputFileTracingIncludes: {
    "/api/planner/report/export": [
      "./public/fonts/NotoSansKR-Regular.ttf",
      "./public/fonts/Pretendard-Regular.ttf",
    ],
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
