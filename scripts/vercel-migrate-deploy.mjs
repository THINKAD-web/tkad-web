/**
 * Vercel build: migrate deploy with Neon cold-start tolerance.
 * - Prefer DATABASE_URL_UNPOOLED (direct) over pooler for migrate
 * - Derive direct URL from pooled Neon host when UNPOOLED is missing
 * - Retry P1001 / connection errors with long backoff
 * - Skip deploy when schema is already up to date
 * - On persistent transient errors only: warn and continue build (exit 0)
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

/** `ep-…-pooler.…neon.tech` → direct compute host (migrate-friendly). */
function toDirectNeonUrl(url) {
  if (!url || !/-pooler\./i.test(url)) return undefined;
  return url.replace(/-pooler\./i, ".");
}

function migrateUrls() {
  const unpooled = cleanUrl(process.env.DATABASE_URL_UNPOOLED);
  const pooled = cleanUrl(process.env.DATABASE_URL);
  const derived = pooled ? toDirectNeonUrl(pooled) : undefined;

  const ordered = [];
  const seen = new Set();
  for (const u of [unpooled, derived, pooled]) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    ordered.push(u);
  }
  return ordered;
}

const urls = migrateUrls();

if (urls.length === 0) {
  console.log(
    "[vercel-migrate] DATABASE_URL 없음 — migrate 생략 (prisma generate만 진행)",
  );
  process.exit(0);
}

const MAX_ATTEMPTS = 8;
/** Total backoff ~90s before giving up on a single URL. */
const DELAYS_MS = [0, 3_000, 5_000, 8_000, 10_000, 12_000, 15_000, 18_000];

function run(cmd, databaseUrl) {
  const env = { ...process.env, DATABASE_URL: databaseUrl };
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
    /ETIMEDOUT/i.test(text) ||
    /ENOTFOUND/i.test(text) ||
    /timeout/i.test(text)
  );
}

function isUpToDate(text) {
  return (
    text.includes("Database schema is up to date") ||
    text.includes("No pending migrations")
  );
}

function hostLabel(url) {
  const host = url.match(/@([^/?]+)/)?.[1] ?? "(unknown)";
  const kind = /-pooler\./i.test(host)
    ? "pooler"
    : cleanUrl(process.env.DATABASE_URL_UNPOOLED) === url
      ? "direct (UNPOOLED)"
      : toDirectNeonUrl(cleanUrl(process.env.DATABASE_URL) ?? "") === url
        ? "direct (derived)"
        : "direct";
  return `${host} [${kind}]`;
}

async function tryMigrateWithUrl(databaseUrl) {
  console.log(`\n[vercel-migrate] trying ${hostLabel(databaseUrl)}`);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (DELAYS_MS[attempt] > 0) {
      console.log(
        `[vercel-migrate] retry ${attempt + 1}/${MAX_ATTEMPTS} (+${DELAYS_MS[attempt]}ms)`,
      );
      await sleep(DELAYS_MS[attempt]);
    }

    const status = run("npx prisma migrate status", databaseUrl);
    process.stdout.write(status.combined);

    if (status.code === 0 && isUpToDate(status.combined)) {
      console.log("\n[vercel-migrate] ✅ schema up to date — deploy 생략");
      return { ok: true, skipped: true };
    }

    if (status.code !== 0 && isTransientDbError(status.combined)) {
      continue;
    }

    const deploy = run("npx prisma migrate deploy", databaseUrl);
    process.stdout.write(deploy.combined);

    if (deploy.code === 0) {
      console.log("\n[vercel-migrate] ✅ migrate deploy 완료");
      return { ok: true, skipped: false };
    }

    if (isTransientDbError(deploy.combined)) {
      continue;
    }

    console.error("\n[vercel-migrate] ❌ migrate 실패 (non-transient)");
    return { ok: false, transient: false };
  }

  return { ok: false, transient: true };
}

async function main() {
  let lastTransient = true;

  for (const url of urls) {
    const result = await tryMigrateWithUrl(url);
    if (result.ok) {
      process.exit(0);
    }
    lastTransient = result.transient !== false;
    if (!result.transient) {
      process.exit(1);
    }
    console.log("[vercel-migrate] 이 URL로 연결 실패 — 다음 후보 시도");
  }

  if (lastTransient) {
    console.warn(`
[vercel-migrate] ⚠️  DB 연결 실패 (P1001 등) — migrate 생략하고 빌드 계속.

Neon scale-to-zero / cold start일 수 있습니다. 스키마 변경이 있었다면:
  1) Neon 콘솔에서 DB 깨우기
  2) 로컬: npm run db:migrate:vercel-prod
  3) Vercel에 DATABASE_URL_UNPOOLED 설정 (권장)
  4) 재배포
`);
    process.exit(0);
  }

  console.error(`
[vercel-migrate] ❌ migrate 실패.

  1) Neon 콘솔에서 DB 상태 확인
  2) 로컬: npm run db:migrate:vercel-prod
  3) Vercel DATABASE_URL / DATABASE_URL_UNPOOLED 확인
`);
  process.exit(1);
}

main();
