/**
 * Vercel build: migrate deploy with Neon cold-start tolerance.
 * - Prefer DATABASE_URL_UNPOOLED (direct) over pooler for migrate
 * - Retry P1001 / connection errors
 * - Skip deploy when schema is already up to date
 */
import { execSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PLACEHOLDER_RE =
  /@ep-xxx\.|\/\/user:password@|ep-xxx\.region\.aws\.neon\.tech/i;

function cleanUrl(raw) {
  const v = raw?.trim();
  if (!v) return undefined;
  if (PLACEHOLDER_RE.test(v)) return undefined;
  const m = v.match(/^DATABASE_URL=(?:"([^"]+)"|'([^']+)'|(\S+))$/i);
  if (m) return (m[1] ?? m[2] ?? m[3])?.trim();
  return v;
}

const url =
  cleanUrl(process.env.DATABASE_URL_UNPOOLED) ??
  cleanUrl(process.env.DATABASE_URL);

if (!url) {
  console.log(
    "[vercel-migrate] DATABASE_URL 없음 — migrate 생략 (prisma generate만 진행)",
  );
  process.exit(0);
}

const host = url.match(/@([^/?]+)/)?.[1] ?? "(unknown)";
const unpooled = Boolean(cleanUrl(process.env.DATABASE_URL_UNPOOLED));
console.log(
  `[vercel-migrate] host: ${host}${unpooled ? " (direct)" : " (pooled)"}`,
);

const env = { ...process.env, DATABASE_URL: url };
const MAX_ATTEMPTS = 5;
const DELAYS_MS = [0, 4_000, 8_000, 12_000, 16_000];

function run(cmd) {
  try {
    const stdout = execSync(cmd, {
      encoding: "utf8",
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { code: 0, combined: stdout };
  } catch (e) {
    const err = e;
    const combined =
      String(err.stdout ?? "") +
      String(err.stderr ?? "") +
      (err.message ?? "");
    return { code: err.status ?? 1, combined };
  }
}

function isTransientDbError(text) {
  return (
    /P1001/i.test(text) ||
    /Can't reach database server/i.test(text) ||
    /P1002/i.test(text) ||
    /advisory lock/i.test(text) ||
    /Connection terminated/i.test(text) ||
    /ECONNREFUSED/i.test(text) ||
    /ETIMEDOUT/i.test(text)
  );
}

function isUpToDate(text) {
  return (
    text.includes("Database schema is up to date") ||
    text.includes("No pending migrations")
  );
}

async function main() {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (DELAYS_MS[attempt] > 0) {
      console.log(
        `[vercel-migrate] retry ${attempt + 1}/${MAX_ATTEMPTS} (${DELAYS_MS[attempt]}ms)`,
      );
      await sleep(DELAYS_MS[attempt]);
    }

    const status = run("npx prisma migrate status");
    process.stdout.write(status.combined);

    if (status.code === 0 && isUpToDate(status.combined)) {
      console.log("\n[vercel-migrate] ✅ schema up to date — deploy 생략");
      process.exit(0);
    }

    if (status.code !== 0 && isTransientDbError(status.combined)) {
      continue;
    }

    const deploy = run("npx prisma migrate deploy");
    process.stdout.write(deploy.combined);

    if (deploy.code === 0) {
      console.log("\n[vercel-migrate] ✅ migrate deploy 완료");
      process.exit(0);
    }

    if (isTransientDbError(deploy.combined)) {
      continue;
    }

    console.error("\n[vercel-migrate] ❌ migrate 실패 (non-transient)");
    process.exit(1);
  }

  console.error(`
[vercel-migrate] ❌ ${MAX_ATTEMPTS}회 재시도 후에도 DB 연결 실패 (P1001 등).

Neon scale-to-zero / pooler cold start 일 수 있습니다.
  1) Neon 콘솔에서 DB 깨우기 또는 scale-to-zero 잠시 OFF
  2) 로컬: npm run db:migrate:vercel-prod
  3) Vercel에 DATABASE_URL_UNPOOLED 설정 확인
  4) 재배포
`);
  process.exit(1);
}

main();
