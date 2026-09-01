"use client";

import { useState } from "react";
import {
  getChildCategories,
  getTopMediaCategories,
  TARGET_CATEGORIES,
  categoryLabel,
  targetLabel,
} from "@/lib/media-categories";
import {
  MEDIA_CATEGORIES,
  browseCategoryLabel,
  isValidBrowseSub,
} from "@/lib/media-browse-categories";
import { MEDIA_BROWSE_REGIONS, browseRegionLabel } from "@/lib/media-browse-regions";
import { isKoreaMediaCountry } from "@/lib/media-country";

type Props = {
  locale?: string;
  /** ISO 3166-1 alpha-2 — LL: 해외일 때 Browse 지역 KR 목록 숨김 */
  country?: string;
  browseMain: string;
  browseSub: string;
  regionMain: string;
  regionSub: string;
  onBrowseMainChange: (slug: string) => void;
  onBrowseSubChange: (slug: string) => void;
  onRegionMainChange: (slug: string) => void;
  onRegionSubChange: (slug: string) => void;
  parentSlug: string;
  subSlugs: string[];
  targetSlugs: string[];
  onParentChange: (slug: string) => void;
  onToggleSub: (slug: string) => void;
  onToggleTarget: (slug: string) => void;
  /** 네트워크 등 — SEO legacy 블록 숨김 */
  hideLegacySeo?: boolean;
};

export function AdminMediaCategoryFields({
  locale = "ko",
  country = "KR",
  browseMain,
  browseSub,
  regionMain,
  regionSub,
  onBrowseMainChange,
  onBrowseSubChange,
  onRegionMainChange,
  onRegionSubChange,
  parentSlug,
  subSlugs,
  targetSlugs,
  onParentChange,
  onToggleSub,
  onToggleTarget,
  hideLegacySeo = false,
}: Props) {
  const [legacyOpen, setLegacyOpen] = useState(false);
  const isKorea = isKoreaMediaCountry(country);
  const browseRegionOptions = isKorea
    ? MEDIA_BROWSE_REGIONS.filter((r) => r.id !== "overseas")
    : MEDIA_BROWSE_REGIONS.filter((r) => r.id === "overseas");
  const tops = getTopMediaCategories();
  const children = parentSlug ? getChildCategories(parentSlug) : [];
  const browseSubs = MEDIA_CATEGORIES.find((m) => m.id === browseMain)?.sub ?? [];
  const regionSubs =
    MEDIA_BROWSE_REGIONS.find((r) => r.id === regionMain)?.sub ?? [];

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/40 p-4">
      <div>
        <p className="mb-2 tkad-type-title text-foreground">
          공개 탐색 카테고리 (Browse)
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block tkad-type-caption text-muted-foreground">
              대분류
            </span>
            <select
              value={browseMain}
              onChange={(e) => {
                onBrowseMainChange(e.target.value);
                onBrowseSubChange("");
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">선택…</option>
              {MEDIA_CATEGORIES.map((m) => (
                <option key={m.id} value={m.id}>
                  {browseCategoryLabel(m.id, locale, "main")}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block tkad-type-caption text-muted-foreground">
              소분류
            </span>
            <select
              value={browseSub}
              disabled={!browseMain}
              onChange={(e) => onBrowseSubChange(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50"
            >
              <option value="">선택…</option>
              {browseSubs.map((s) => (
                <option key={s.id} value={s.id}>
                  {browseCategoryLabel(s.id, locale, "sub", browseMain)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div>
        <p className="mb-2 tkad-type-title text-foreground">Browse 지역</p>
        {!isKorea ? (
          <p className="mb-2 tkad-type-note text-amber-800">
            해외 매체 — 「해외」로 분류됩니다. 한국 시·도 taxonomy는 사용하지
            않습니다.
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block tkad-type-caption text-muted-foreground">
              시·도
            </span>
            <select
              value={regionMain}
              disabled={!isKorea && browseRegionOptions.length <= 1}
              onChange={(e) => {
                onRegionMainChange(e.target.value);
                onRegionSubChange("");
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-70"
            >
              <option value="">선택…</option>
              {browseRegionOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {browseRegionLabel(r.id, locale, "main")}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block tkad-type-caption text-muted-foreground">
              세부 지역
            </span>
            <select
              value={regionSub}
              disabled={!regionMain}
              onChange={(e) => onRegionSubChange(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50"
            >
              <option value="">선택…</option>
              {regionSubs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {!hideLegacySeo ? (
      <details
        open={legacyOpen}
        onToggle={(e) => setLegacyOpen(e.currentTarget.open)}
        className="rounded-lg border border-dashed border-border bg-card/50 p-3"
      >
        <summary className="cursor-pointer tkad-type-title text-muted-foreground">
          SEO 카테고리 (legacy, 선택)
        </summary>
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block tkad-type-caption text-muted-foreground">
              SEO 대분류
            </label>
            <select
              value={parentSlug}
              onChange={(e) => onParentChange(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">선택…</option>
              {tops.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {categoryLabel(t.slug, locale)}
                </option>
              ))}
            </select>
          </div>
          {children.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {children.map((c) => (
                <label
                  key={c.slug}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={subSlugs.includes(c.slug)}
                    onChange={() => onToggleSub(c.slug)}
                  />
                  {categoryLabel(c.slug, locale)}
                </label>
              ))}
            </div>
          ) : null}
        </div>
      </details>
      ) : null}

      <div>
        <p className="mb-2 tkad-type-title text-foreground">
          적합 캠페인 타겟
        </p>
        <div className="flex flex-wrap gap-2">
          {TARGET_CATEGORIES.map((t) => (
            <label
              key={t.slug}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs"
            >
              <input
                type="checkbox"
                checked={targetSlugs.includes(t.slug)}
                onChange={() => onToggleTarget(t.slug)}
              />
              {targetLabel(t.slug, locale)}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export function mergeMediaCategoryForm(
  parentSlug: string,
  subSlugs: string[],
  browseMain?: string,
  browseSub?: string,
): string[] {
  const out = new Set<string>();
  if (browseMain) out.add(browseMain);
  if (browseSub) out.add(browseSub);
  if (parentSlug) out.add(parentSlug);
  subSlugs.forEach((s) => out.add(s));
  return [...out];
}

export function splitMediaCategoryForm(slugs: string[]): {
  parentSlug: string;
  subSlugs: string[];
} {
  const tops = new Set(getTopMediaCategories().map((t) => t.slug));
  const browseIds = new Set(MEDIA_CATEGORIES.map((m) => m.id));
  const parent = slugs.find((s) => tops.has(s)) ?? "";
  const subs = slugs.filter(
    (s) => !tops.has(s) && !browseIds.has(s) && !MEDIA_CATEGORIES.some(
      (m) => m.sub.some((sub) => sub.id === s),
    ),
  );
  return { parentSlug: parent, subSlugs: subs };
}

export function browseFieldsFromDto(m: {
  mediaMainCategory?: string | null;
  mediaSubCategory?: string | null;
  regionMain?: string | null;
  regionSub?: string | null;
}): {
  browseMain: string;
  browseSub: string;
  regionMain: string;
  regionSub: string;
} {
  return {
    browseMain: m.mediaMainCategory?.trim() ?? "",
    browseSub: m.mediaSubCategory?.trim() ?? "",
    regionMain: m.regionMain?.trim() ?? "",
    regionSub: m.regionSub?.trim() ?? "",
  };
}

export function validateBrowseFields(
  browseMain: string,
  browseSub: string,
): string | null {
  if (browseSub && browseMain && !isValidBrowseSub(browseMain, browseSub)) {
    return "Browse 소분류가 대분류와 맞지 않습니다.";
  }
  return null;
}
