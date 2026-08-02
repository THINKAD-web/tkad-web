/**
 * Neon scale-to-zero: wake compute before migrate deploy (best-effort).
 * Never fails the build — migrate deploy remains the real gate.
 */
import { setTimeout as sleep } from "node:timers/promises";
import pg from "pg";

const { Client } = pg;

const PLACEHOLDER_RE =
  /@ep-xxx\.|\/\/user:password@|ep-xxx\.region\.aws\.neon\.tech/i;

const MAX_ATTEMPTS = 6;
const RETRY_DELAY_MS = 3_000;
const CONNECTION_TIMEOUT_MS = 10_000;

function cleanUrl(raw) {
  const v = raw?.trim();
  if (!v) return undefined;
  if (PLACEHOLDER_RE.test(v)) return undefined;
  const m = v.match(/^DATABASE_URL=(?:"([^"]+)"|'([^']+)'|(\S+))$/i);
  if (m) return (m[1] ?? m[2] ?? m[3])?.trim();
  return v;
}

function resolveWakeUrl() {
  return (
    cleanUrl(process.env.DATABASE_URL_UNPOOLED) ??
    cleanUrl(process.env.DATABASE_URL)
  );
}

function hostLabel(url) {
  const host = url.match(/@([^/?]+)/)?.[1] ?? "(unknown)";
  const kind = /-pooler\./i.test(host) ? "pooler" : "direct";
  return `${host} [${kind}]`;
}

async function pingOnce(databaseUrl) {
  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  });
  try {
    await client.connect();
    await client.query("SELECT 1");
    return { ok: true };
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  const databaseUrl = resolveWakeUrl();

  if (!databaseUrl) {
    console.log(
      "[db-wake] DATABASE_URL_UNPOOLED/DATABASE_URL 없음 — wake 생략",
    );
    process.exit(0);
  }

  console.log(`[db-wake] waking ${hostLabel(databaseUrl)}`);

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      console.log(
        `[db-wake] retry ${attempt}/${MAX_ATTEMPTS} (+${RETRY_DELAY_MS}ms)`,
      );
      await sleep(RETRY_DELAY_MS);
    }

    try {
      await pingOnce(databaseUrl);
      console.log(`[db-wake] ✅ DB awake (attempt ${attempt}/${MAX_ATTEMPTS})`);
      process.exit(0);
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      console.log(`[db-wake] attempt ${attempt}/${MAX_ATTEMPTS} failed: ${message}`);
    }
  }

  console.warn(`
[db-wake] ⚠️  DB wake failed after ${MAX_ATTEMPTS} attempts — 빌드 계속.
  migrate deploy가 실제 연결 게이트입니다.
  last error: ${lastError instanceof Error ? lastError.message : String(lastError)}
`);
  process.exit(0);
}

main().catch((err) => {
  console.warn(
    `[db-wake] ⚠️  unexpected error — 빌드 계속: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(0);
});
