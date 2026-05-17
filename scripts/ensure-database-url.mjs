#!/usr/bin/env node
/**
 * prisma db push / migrate 전에 .env · .env.local에서 DATABASE_URL 로드 후 존재 여부 확인.
 */
import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.development"), override: true });
config({ path: resolve(root, ".env.local"), override: true });
config({ path: resolve(root, ".env.development.local"), override: true });

function cleanUrl(raw) {
  if (!raw?.trim()) return undefined;
  const v = raw.trim();
  if (/@ep-xxx\.|\/\/user:password@|ep-xxx\.region\.aws\.neon\.tech/i.test(v)) {
    return undefined;
  }
  const m = v.match(/^DATABASE_URL=(?:"([^"]+)"|'([^']+)'|(\S+))$/i);
  if (m) return (m[1] ?? m[2] ?? m[3])?.trim();
  return v;
}

const resolved =
  cleanUrl(process.env.DATABASE_URL) ??
  cleanUrl(process.env.DATABASE_URL_UNPOOLED);

if (!resolved) {
  console.error(`
[tkad-web] DATABASE_URL (또는 DATABASE_URL_UNPOOLED)이 설정되어 있지 않습니다.

다음 중 하나를 하세요:
  1) 프로젝트 루트 .env.local 에 Neon Pooled 연결 문자열만 넣기
     DATABASE_URL=postgresql://neondb_owner:...@ep-....-pooler....neon.tech/neondb?sslmode=require
  2) Vercel: DATABASE_URL 또는 DATABASE_URL_UNPOOLED (값에 DATABASE_URL= 접두어 넣지 말 것)

그 다음:
  npm run db:push
`);
  process.exit(1);
}

process.env.DATABASE_URL = resolved;
const url = resolved;
if (
  /@ep-xxx\.|@ep-xxx\.region\.|\/\/user:password@/i.test(url) ||
  url.includes("ep-xxx.region.aws.neon.tech")
) {
  console.error(`
[tkad-web] DATABASE_URL이 아직 예시(.env.production.example) 값입니다.

  현재: ep-xxx / user:password 같은 placeholder → DB에 연결되지 않습니다.

  1) Neon Console → 프로젝트 → Connection details → Pooled connection
  2) 연결 문자열 전체 복사
  3) 프로젝트 루트 .env.local 의 DATABASE_URL= 한 줄만 교체
  4) npm run db:push 다시 실행
`);
  process.exit(1);
}
