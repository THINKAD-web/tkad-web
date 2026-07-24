/**
 * Allow only relative paths on Digital (open-redirect guard).
 * Examples: `/`, `/checkout/basic`, `/contact?tier=pro`
 */
export function sanitizeSsoReturnTo(raw: string | null | undefined): string {
  if (!raw) return "/";
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.includes("\\") || /[\x00-\x1f]/.test(value)) return "/";
  try {
    const u = new URL(value, "https://digital.tkad.co.kr");
    if (u.origin !== "https://digital.tkad.co.kr") return "/";
    return `${u.pathname}${u.search}${u.hash}` || "/";
  } catch {
    return "/";
  }
}

export function sanitizeSsoState(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (value.length < 8 || value.length > 128) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  return value;
}
