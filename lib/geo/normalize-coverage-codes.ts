import { isAllowedCoverageDistrictCode } from "@/lib/geo/korea-sgg-coverage";

const MAX_CODES = 300;

/**
 * `PATCH` 에서 `undefined` → 필드 미변경(null 반환).
 * `POST` / 폼 저장은 `[]` 또는 코드 배열을 넘기면 된다.
 */
export function normalizeCoverageDistrictCodesInput(
  raw: unknown,
): string[] | null {
  if (raw === undefined) return null;
  if (raw === null) return [];
  if (!Array.isArray(raw)) return null;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of raw) {
    if (typeof x !== "string") return null;
    const c = x.trim();
    if (!c || seen.has(c)) continue;
    if (!/^\d{5}$/.test(c) || !isAllowedCoverageDistrictCode(c)) return null;
    seen.add(c);
    out.push(c);
    if (out.length >= MAX_CODES) break;
  }
  return out;
}
