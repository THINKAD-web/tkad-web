/**
 * Resolve Postgres URL for Prisma / pg.
 * Vercel+Neon often inject `DATABASE_URL_UNPOOLED` only; this app accepts either key.
 */
const PLACEHOLDER_RE =
  /@ep-xxx\.|\/\/user:password@|ep-xxx\.region\.aws\.neon\.tech/i;

function clean(raw: string | undefined): string | undefined {
  const v = raw?.trim();
  if (!v) return undefined;
  if (PLACEHOLDER_RE.test(v)) return undefined;
  // Vercel paste mistake: value includes `DATABASE_URL="..."`
  const m = v.match(/^DATABASE_URL=(?:"([^"]+)"|'([^']+)'|(\S+))$/i);
  if (m) return (m[1] ?? m[2] ?? m[3])?.trim();
  return v;
}

export function resolveDatabaseUrl(): string | undefined {
  const primary = clean(process.env.DATABASE_URL);
  if (primary) return primary;
  return clean(process.env.DATABASE_URL_UNPOOLED);
}

export function isDatabaseUrlConfigured(): boolean {
  return !!resolveDatabaseUrl();
}

/** Ensure `process.env.DATABASE_URL` is set for libraries that only read that key. */
export function ensureDatabaseUrlEnv(): string | undefined {
  const url = resolveDatabaseUrl();
  if (url) process.env.DATABASE_URL = url;
  return url;
}
