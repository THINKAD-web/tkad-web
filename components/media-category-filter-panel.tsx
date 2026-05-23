"use client";

import { useMemo } from "react";
import {
  getTopMediaCategories,
  getChildCategories,
  TARGET_CATEGORIES,
  categoryLabel,
  targetLabel,
} from "@/lib/media-categories";
import { cn } from "@/lib/utils";

type Props = {
  locale: string;
  selectedMediaSlugs: string[];
  selectedTargetSlugs: string[];
  onToggleMedia: (slug: string) => void;
  onToggleTarget: (slug: string) => void;
  onClear: () => void;
  className?: string;
};

export function MediaCategoryFilterPanel({
  locale,
  selectedMediaSlugs,
  selectedTargetSlugs,
  onToggleMedia,
  onToggleTarget,
  onClear,
  className,
}: Props) {
  const isKo = locale.startsWith("ko");
  const tops = useMemo(() => getTopMediaCategories(), []);
  const hasSelection =
    selectedMediaSlugs.length > 0 || selectedTargetSlugs.length > 0;

  return (
    <aside className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-foreground">
          {isKo ? "카테고리 필터" : "Category filters"}
        </h2>
        {hasSelection ? (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
          >
            {isKo ? "초기화" : "Clear"}
          </button>
        ) : null}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {isKo ? "매체 유형" : "Media type"}
        </p>
        <ul className="space-y-3">
          {tops.map((top) => {
            const children = getChildCategories(top.slug);
            const topChecked = selectedMediaSlugs.includes(top.slug);
            return (
              <li key={top.slug}>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={topChecked}
                    onChange={() => onToggleMedia(top.slug)}
                    className="size-4 rounded border-gray-300"
                  />
                  <span>
                    {top.icon ? `${top.icon} ` : ""}
                    {categoryLabel(top.slug, locale)}
                  </span>
                </label>
                {children.length > 0 ? (
                  <ul className="ml-6 mt-2 space-y-1.5 border-l border-border pl-3">
                    {children.map((child) => (
                      <li key={child.slug}>
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={selectedMediaSlugs.includes(child.slug)}
                            onChange={() => onToggleMedia(child.slug)}
                            className="size-3.5 rounded border-gray-300"
                          />
                          {categoryLabel(child.slug, locale)}
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {isKo ? "캠페인 목적" : "Campaign purpose"}
        </p>
        <ul className="space-y-2">
          {TARGET_CATEGORIES.map((t) => (
            <li key={t.slug}>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedTargetSlugs.includes(t.slug)}
                  onChange={() => onToggleTarget(t.slug)}
                  className="size-4 rounded border-gray-300"
                />
                <span>
                  {t.icon ? `${t.icon} ` : ""}
                  {targetLabel(t.slug, locale)}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
