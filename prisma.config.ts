/**
 * Prisma 7: DB URL은 여기서만 설정합니다(schema.prisma의 datasource에는 url 없음).
 * - `prisma generate`는 URL 없이도 됩니다.
 * - `db push` / migrate는 URL 필요 → `.env` 또는 `.env.local`에 DATABASE_URL을 두세요.
 * - 안내 메시지와 함께 실행: `npm run db:push`
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { defineConfig } from "prisma/config";
import { resolveDatabaseUrl } from "./lib/database-url";

const root = process.cwd();
/** CLI `DATABASE_URL=... npx prisma` should win over stale `.env.local` */
const databaseUrlFromCli = process.env.DATABASE_URL?.trim();
loadEnv({ path: resolve(root, ".env") });
loadEnv({ path: resolve(root, ".env.development"), override: true });
loadEnv({ path: resolve(root, ".env.local"), override: true });
loadEnv({ path: resolve(root, ".env.development.local"), override: true });
if (databaseUrlFromCli) {
  process.env.DATABASE_URL = databaseUrlFromCli;
}

const databaseUrl = resolveDatabaseUrl();
if (databaseUrl) process.env.DATABASE_URL = databaseUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  ...(databaseUrl
    ? {
        datasource: {
          url: databaseUrl,
        },
      }
    : {}),
});
