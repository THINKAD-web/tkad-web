import { convert as romanizeHangul } from "hangul-romanization";

const SLUG_MAX = 80;

/** CUID-like media id (Prisma default) */
export function isMediaCuid(value: string): boolean {
  return /^c[a-z0-9]{20,}$/i.test(value);
}

function basicSlugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX);
}

/**
 * 매체명 → URL slug.
 * - nameEn 우선, 없으면 한글 로마자 변환
 * - 중복 시 `-1`, `-2` … 접미사
 */
export function mediaNameToSlugBase(name: string, nameEn?: string | null): string {
  const en = nameEn?.trim();
  if (en) {
    const fromEn = basicSlugify(en);
    if (fromEn.length >= 2) return fromEn;
  }

  const ko = name.trim();
  if (!ko) return "media";

  const hasHangul = /[가-힣]/.test(ko);
  const romanized = hasHangul ? romanizeHangul(ko) : ko;
  const slug = basicSlugify(romanized);
  return slug.length >= 2 ? slug : basicSlugify(ko) || "media";
}

export function allocateUniqueSlug(
  base: string,
  used: Set<string>,
): string {
  const root = base.slice(0, SLUG_MAX) || "media";
  if (!used.has(root)) {
    used.add(root);
    return root;
  }
  for (let i = 1; i < 10_000; i++) {
    const candidate = `${root.slice(0, Math.max(1, SLUG_MAX - String(i).length - 1))}-${i}`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
  const fallback = `${root}-${Date.now().toString(36)}`;
  used.add(fallback);
  return fallback;
}

export function generateMediaSlug(
  name: string,
  nameEn: string | null | undefined,
  used: Set<string>,
): string {
  const base = mediaNameToSlugBase(name, nameEn);
  return allocateUniqueSlug(base, used);
}
