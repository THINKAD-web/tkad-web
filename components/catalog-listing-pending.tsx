"use client";

import type { CatalogListingNotice } from "@/lib/catalog-listing-pending";

/** 입점대기 뱃지 — 제안서/견적 우선, 매체 상세·어드민에서도 재사용 가능 */
export function CatalogListingPendingBadge({
  status,
  isKo,
}: {
  status: CatalogListingNotice["status"];
  isKo: boolean;
}) {
  if (status === "available") return null;
  const label =
    status === "pending"
      ? isKo ? "입점대기" : "Listing pending"
      : isKo ? "일부 매칭" : "Partial match";
  return (
    <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200">
      {label}
    </span>
  );
}

export function CatalogListingPendingList({
  notices,
  isKo,
}: {
  notices: readonly CatalogListingNotice[];
  isKo: boolean;
}) {
  if (notices.length === 0) return null;
  return (
    <div className="rounded-lg border border-amber-200/80 bg-amber-50/60 p-3 dark:border-amber-800/40 dark:bg-amber-950/20">
      <p className="mb-1.5 text-xs font-semibold text-amber-900 dark:text-amber-100">
        {isKo ? "입점대기 매체" : "Listing pending"}
      </p>
      <ul className="space-y-1">
        {notices.map((n) => (
          <li
            key={n.kind}
            className="flex items-start gap-2 text-xs leading-relaxed text-amber-900/90 dark:text-amber-100/90"
          >
            <CatalogListingPendingBadge status={n.status} isKo={isKo} />
            <span>{isKo ? n.lineKo : n.lineEn}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
