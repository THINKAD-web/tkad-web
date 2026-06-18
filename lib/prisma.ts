import type { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import { statSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Pool } from "pg";
import {
  ensureDatabaseUrlEnv,
  isDatabaseUrlConfigured,
  resolveDatabaseUrl,
} from "@/lib/database-url";
import { normalizePgDatabaseUrl } from "@/lib/normalize-pg-database-url";

declare global {
  var prisma: PrismaClient | undefined;
  /** dev: 생성 시점의 `.prisma/client` 번들 mtime — `prisma generate` 후 싱글톤 무효화 */
  var __prismaClientBundleMtimeMs: number | undefined;
}

/**
 * Next/dotenv는 이미 설정된 `process.env` 키를 덮어쓰지 않는 경우가 있어,
 * `.env`에 남은 예전 `DATABASE_URL`이 `.env.local`(Vercel pull)보다 우선할 수 있습니다.
 * `prisma.config.ts`와 같은 순서로 파일을 다시 읽어 `.env.local`이 이깁니다.
 */
function ensureLocalDatabaseEnvFromFiles(): void {
  if (process.env.NODE_ENV === "production") return;
  const root = process.cwd();
  loadEnv({ path: resolve(root, ".env") });
  loadEnv({ path: resolve(root, ".env.development"), override: true });
  loadEnv({ path: resolve(root, ".env.local"), override: true });
  loadEnv({ path: resolve(root, ".env.development.local"), override: true });
}

ensureLocalDatabaseEnvFromFiles();

/** dev 전용: 첫 요청에 만든 Pool 이 예전 DATABASE_URL 을 물고 있으면 P1000 이 계속 남음 */
let devPrismaDatabaseUrl: string | undefined;

function readPrismaClientBundleMtimeMs(): number | null {
  try {
    const p = join(process.cwd(), "node_modules", ".prisma", "client", "index.js");
    return statSync(p).mtimeMs;
  } catch {
    return null;
  }
}

function bustPrismaClientModuleCache(): void {
  if (process.env.NODE_ENV === "production") return;
  const roots = [
    join(process.cwd(), "node_modules", "@prisma", "client"),
    join(process.cwd(), "node_modules", ".prisma", "client"),
  ];
  for (const key of Object.keys(require.cache)) {
    if (roots.some((root) => key.startsWith(root))) {
      delete require.cache[key];
    }
  }
}

function loadPrismaClientCtor(): typeof PrismaClient {
  // prisma generate 후 dev HMR 없이도 최신 delegate 로드
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("@prisma/client") as typeof import("@prisma/client");
  return mod.PrismaClient;
}

function createPrismaClient(): PrismaClient {
  const rawUrl = ensureDatabaseUrlEnv();
  if (!rawUrl) {
    throw new Error(
      "Missing DATABASE_URL (or DATABASE_URL_UNPOOLED). Add Neon connection string to .env.local or Vercel env.",
    );
  }

  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(rawUrl),
    max: Number(process.env.DATABASE_POOL_MAX || 15),
  });

  const PrismaClientCtor = loadPrismaClientCtor();
  return new PrismaClientCtor({
    adapter: new PrismaPg(pool),
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });
}

function generatedClientHasSavedPlanCart(): boolean {
  try {
    const p = join(process.cwd(), "node_modules", ".prisma", "client", "index.d.ts");
    return readFileSync(p, "utf8").includes("savedPlanCart");
  } catch {
    return false;
  }
}

function shouldRefreshPrismaSingleton(client: PrismaClient): boolean {
  const bundleMtime = readPrismaClientBundleMtimeMs();
  const createdMtime = globalThis.__prismaClientBundleMtimeMs;
  if (bundleMtime != null && createdMtime != null && bundleMtime > createdMtime) {
    return true;
  }
  if (process.env.NODE_ENV === "production") return false;
  const record = client as unknown as Record<string, unknown>;
  if (record.savedPlanCart !== undefined) return false;
  return generatedClientHasSavedPlanCart();
}

function invalidatePrismaSingleton(): void {
  const stale = globalThis.prisma;
  globalThis.prisma = undefined;
  devPrismaDatabaseUrl = undefined;
  globalThis.__prismaClientBundleMtimeMs = undefined;
  bustPrismaClientModuleCache();
  if (stale) void stale.$disconnect().catch(() => {});
}

/** dev: prisma generate 직후 싱글톤·모듈 캐시 초기화 */
export function refreshPrismaClient(): PrismaClient {
  invalidatePrismaSingleton();
  return getPrisma();
}

export function getPrisma(): PrismaClient {
  if (process.env.NODE_ENV !== "production") {
    ensureLocalDatabaseEnvFromFiles();
    const cs = resolveDatabaseUrl();
    if (globalThis.prisma && devPrismaDatabaseUrl !== cs) {
      invalidatePrismaSingleton();
    }
    if (globalThis.prisma && shouldRefreshPrismaSingleton(globalThis.prisma)) {
      invalidatePrismaSingleton();
    }
  }
  if (globalThis.prisma) return globalThis.prisma;
  const client = createPrismaClient();
  // 프로덕션에서도 싱글톤 유지 — 미설정 시 요청·Proxy 접근마다 Pool/Client 가
  // 새로 생겨 Neon 연결 고갈·간헐 500(특히 /api/media/map 반복)로 이어질 수 있음.
  globalThis.prisma = client;
  if (process.env.NODE_ENV !== "production") {
    devPrismaDatabaseUrl = resolveDatabaseUrl();
    const m = readPrismaClientBundleMtimeMs();
    if (m != null) globalThis.__prismaClientBundleMtimeMs = m;
  }
  return client;
}

const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return (getPrisma() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export function isDatabaseConfigured(): boolean {
  return isDatabaseUrlConfigured();
}

export default prisma;
export { prisma };
