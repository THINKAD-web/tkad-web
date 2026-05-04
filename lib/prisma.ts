import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { Pool } from "pg";

declare global {
  var prisma: PrismaClient | undefined;
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

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(
      "Missing DATABASE_URL. Add it to .env (e.g. Neon: https://neon.tech → Connection string)",
    );
  }

  const pool = new Pool({
    connectionString,
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
      void stale.$disconnect().catch(() => {});
    }
  }
  if (globalThis.prisma) return globalThis.prisma;
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalThis.prisma = client;
    devPrismaDatabaseUrl = process.env.DATABASE_URL?.trim();
  }
  return client;
}

const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return (getPrisma() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL?.trim();
}

export default prisma;
export { prisma };
