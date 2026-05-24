"use client";

import {
  getChildCategories,
  getTopMediaCategories,
  TARGET_CATEGORIES,
  categoryLabel,
  targetLabel,
} from "@/lib/media-categories";

type Props = {
  locale?: string;
  parentSlug: string;
  subSlugs: string[];
  targetSlugs: string[];
  onParentChange: (slug: string) => void;
  onToggleSub: (slug: string) => void;
  onToggleTarget: (slug: string) => void;
};

export function AdminMediaCategoryFields({
  locale = "ko",
  parentSlug,
  subSlugs,
  targetSlugs,
  onParentChange,
  onToggleSub,
  onToggleTarget,
}: Props) {
  const tops = getTopMediaCategories();
  const children = parentSlug ? getChildCategories(parentSlug) : [];

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/40 p-4">
      <div>
        <p className="mb-2 text-xs font-semibold text-foreground">매체 카테고리</p>
        <label className="mb-1 block text-[11px] text-muted-foreground">
          대분류
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
        <div>
          <p className="mb-2 text-[11px] text-muted-foreground">소분류 (복수)</p>
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
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-xs font-semibold text-foreground">
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
): string[] {
  const out = new Set<string>();
  if (parentSlug) out.add(parentSlug);
  subSlugs.forEach((s) => out.add(s));
  return [...out];
}

export function splitMediaCategoryForm(slugs: string[]): {
  parentSlug: string;
  subSlugs: string[];
} {
  const tops = new Set(getTopMediaCategories().map((t) => t.slug));
  const parent = slugs.find((s) => tops.has(s)) ?? "";
  const subs = slugs.filter((s) => !tops.has(s));
  return { parentSlug: parent, subSlugs: subs };
}
