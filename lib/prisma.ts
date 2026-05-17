import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import { statSync } from "node:fs";
import { join, resolve } from "node:path";
import { Pool } from "pg";
import {
  isValidPostgresDatabaseUrl,
  stripDatabaseUrlQuotes,
} from "@/lib/format-db-api-error";
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

function readDatabaseUrl(): string | undefined {
  if (process.env.NODE_ENV !== "production") {
    ensureLocalDatabaseEnvFromFiles();
  }
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return undefined;
  const stripped = stripDatabaseUrlQuotes(raw);
  if (stripped !== raw) {
    process.env.DATABASE_URL = stripped;
  }
  return stripped;
}

function createPrismaClient(): PrismaClient {
  const rawUrl = readDatabaseUrl();
  if (!rawUrl) {
    throw new Error(
      "Missing DATABASE_URL. Add it to .env (e.g. Neon: https://neon.tech → Connection string)",
    );
  }
  if (!isValidPostgresDatabaseUrl(rawUrl)) {
    throw new Error(
      "Invalid DATABASE_URL. Use a postgresql:// connection string from Neon (see .env.production.example).",
    );
  }

  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(rawUrl),
    max: Number(process.env.DATABASE_POOL_MAX || 15),
  });

  return new PrismaClient({
    adapter: new PrismaPg(pool),
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });
}

export function getPrisma(): PrismaClient {
  if (process.env.NODE_ENV !== "production") {
    ensureLocalDatabaseEnvFromFiles();
    const cs = process.env.DATABASE_URL?.trim();
    if (globalThis.prisma && devPrismaDatabaseUrl !== cs) {
      const stale = globalThis.prisma;
      globalThis.prisma = undefined;
      devPrismaDatabaseUrl = undefined;
      globalThis.__prismaClientBundleMtimeMs = undefined;
      void stale.$disconnect().catch(() => {});
    }
    const bundleMtime = readPrismaClientBundleMtimeMs();
    const createdMtime = globalThis.__prismaClientBundleMtimeMs;
    if (
      globalThis.prisma &&
      bundleMtime != null &&
      createdMtime != null &&
      bundleMtime > createdMtime
    ) {
      const stale = globalThis.prisma;
      globalThis.prisma = undefined;
      globalThis.__prismaClientBundleMtimeMs = undefined;
      void stale.$disconnect().catch(() => {});
    }
  }
  if (globalThis.prisma) return globalThis.prisma;
  const client = createPrismaClient();
  // 프로덕션에서도 싱글톤 유지 — 미설정 시 요청·Proxy 접근마다 Pool/Client 가
  // 새로 생겨 Neon 연결 고갈·간헐 500(특히 /api/media/map 반복)로 이어질 수 있음.
  globalThis.prisma = client;
  if (process.env.NODE_ENV !== "production") {
    devPrismaDatabaseUrl = process.env.DATABASE_URL?.trim();
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
  const url = readDatabaseUrl();
  return !!url && isValidPostgresDatabaseUrl(url);
}

export default prisma;
export { prisma };
