/**
 * `pg` / `pg-connection-string` v2 treats `sslmode=require|prefer|verify-ca` as
 * aliases for `verify-full`, and emits a forward-compat warning (Node console).
 *
 * Neon 등에서 흔한 `?sslmode=require` 를 명시적으로 `verify-full` 로 바꿔
 * 현재 동작과 동일한 수준을 유지하면서 경고를 없앱니다.
 *
 * @see https://www.postgresql.org/docs/current/libpq-ssl.html
 */
export function normalizePgDatabaseUrl(url: string): string {
  let u = url.trim();
  // `channel_binding=require` breaks some local node-pg builds; Neon pooler works without it.
  u = u.replace(/([?&])channel_binding=[^&]*&?/gi, (_, sep) =>
    sep === "?" ? "?" : "",
  );
  u = u.replace(/\?&/, "?").replace(/[?&]$/, "");
  if (!/[?&]sslmode=/i.test(u)) return u;
  return u.replace(
    /([?&])sslmode=(prefer|require|verify-ca)\b/gi,
    "$1sslmode=verify-full",
  );
}
