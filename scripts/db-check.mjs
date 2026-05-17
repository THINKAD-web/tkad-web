#!/usr/bin/env node
/**
 * Neon 연결 진단 — P1001 vs 비밀번호 오류를 구분해 안내합니다.
 */
import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.development"), override: true });
config({ path: resolve(root, ".env.local"), override: true });
config({ path: resolve(root, ".env.development.local"), override: true });

function clean(raw) {
  if (!raw?.trim()) return undefined;
  const v = raw.trim();
  if (/@ep-xxx\.|\/\/user:password@|ep-xxx\.region\.aws\.neon\.tech/i.test(v)) {
    return undefined;
  }
  const m = v.match(/^DATABASE_URL=(?:"([^"]+)"|'([^']+)'|(\S+))$/i);
  if (m) return (m[1] ?? m[2] ?? m[3])?.trim();
  return v;
}

const url =
  clean(process.env.DATABASE_URL) ?? clean(process.env.DATABASE_URL_UNPOOLED);

if (!url) {
  console.error(`
[db-check] DATABASE_URL / DATABASE_URL_UNPOOLED 이 없거나 예시(ep-xxx) 값입니다.
→ .env.local 에 Neon Pooled 연결 문자열을 넣으세요.
`);
  process.exit(1);
}

let host = "";
try {
  host = new URL(url).hostname;
} catch {
  console.error("[db-check] DATABASE_URL 형식이 잘못되었습니다.");
  process.exit(1);
}

console.log(`[db-check] host: ${host}`);
console.log("[db-check] connecting…");

const pool = new pg.Pool({
  connectionString: url.replace(
    /([?&])sslmode=(prefer|require|verify-ca)\b/gi,
    "$1sslmode=verify-full",
  ),
  connectionTimeoutMillis: 12000,
  max: 1,
});

try {
  const r = await pool.query("SELECT 1 AS ok");
  console.log("[db-check] OK — DB 연결 성공", r.rows[0]);
  process.exit(0);
} catch (e) {
  const code = e?.code ?? "";
  const msg = e?.message ?? String(e);
  console.error("[db-check] FAIL —", msg);

  if (code === "28P01" || /password authentication failed/i.test(msg)) {
    console.error(`
원인: 비밀번호가 Neon 과 맞지 않습니다 (Prisma 는 이걸 P1001 로 보여주기도 함).

해결:
  1) Neon Console → Connection details → Pooled connection 문자열 다시 복사
  2) /workspace/.env.local 의 DATABASE_URL= 한 줄만 교체 (비밀번호 재발급했으면 새 npg_… 사용)
  3) Vercel Production 에도 같은 값 (Key 이름: DATABASE_URL)
  4) npm run db:check 다시 실행
`);
  } else if (code === "ENOTFOUND" || code === "ETIMEDOUT" || /timeout/i.test(msg)) {
    console.error(`
원인: 네트워크에서 Neon 5432 에 닿지 못함 (Cursor 클라우드 workspace 에서 흔함).

해결:
  • 스키마는 이미 맞을 수 있음 → npm run dev 로 앱만 확인
  • db push 가 꼭 필요하면 Mac 일반 터미널에서: cd /workspace && npm run db:push
`);
  } else {
    console.error(`
추가 확인: Neon 프로젝트 일시중지 여부, IP allowlist, 연결 문자열의 -pooler 호스트
`);
  }
  process.exit(1);
} finally {
  await pool.end().catch(() => {});
}
