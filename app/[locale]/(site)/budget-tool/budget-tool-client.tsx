"use client";

import { Link } from "@/i18n/navigation";
import { MediaCard } from "@/components/media/media-card";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import { mapMediaItemToHomeCatalog } from "@/lib/media-catalog-map";
import { mediaCardStaticHandlers } from "@/lib/media-card-static-handlers";
import type { BudgetCuration } from "@/lib/budget-tool-curations";
import { CategoryExploreHero } from "@/components/category-explore-hero";

export function BudgetToolClient({
  curations,
  locale,
}: {
  curations: BudgetCuration[];
  locale: string;
}) {
  const isKo = locale.startsWith("ko");

  return (
    <div className="min-h-screen pb-20">
      <CategoryExploreHero
        code="// BUDGET"
        headlineBefore={isKo ? "예산별 " : "Curated by "}
        headlineGradient={isKo ? "매체 자동 제안" : "budget"}
        subtitle={
          isKo
            ? "월 예산에 맞춰 검증된 매체 조합을 바로 확인하고 견적·플래너로 이어가세요."
            : "See verified media mixes for your monthly budget, then quote or plan."
        }
      />

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-10">
        {curations.map((c) => (
          <section
            key={c.tier.id}
            className="rounded-2xl border-2 border-border bg-card p-6 sm:p-8"
          >
            <h2 className="text-xl font-black text-foreground">
              {isKo ? c.tier.titleKo : c.tier.titleEn}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isKo ? c.tier.descKo : c.tier.descEn}
            </p>
            <p className="mt-3 text-sm font-bold text-accent">
              {isKo ? "합계 약 " : "Total ~ "}
              {c.totalPriceMan.toLocaleString(isKo ? "ko-KR" : "en-US")}
              {isKo ? "만원/월" : "M KRW/mo"}
            </p>

            {c.items.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                {isKo
                  ? "조건에 맞는 매체가 부족합니다. 예산을 조정해 보세요."
                  : "Not enough media in range. Try a higher budget."}
              </p>
            ) : (
              <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {c.items.map((m) => {
                  const priceLabel =
                    m.price > 0
                      ? formatCatalogPriceFieldWon(m.price, locale)
                      : null;
                  return (
                    <li key={m.id} className="list-none">
                      <MediaCard
                        mode="card"
                        item={mapMediaItemToHomeCatalog(m)}
                        href={mediaItemDetailPath(m)}
                        priceLabel={priceLabel}
                        isKo={isKo}
                        showPlanButton
                        {...mediaCardStaticHandlers}
                      />
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/quote?media=${encodeURIComponent(c.mediaIds.join(","))}`}
                className="rounded-xl bg-foreground px-5 py-2.5 text-sm font-bold text-background"
              >
                {isKo ? "이 조합으로 견적" : "Quote this mix"}
              </Link>
              <Link
                href={`/recommend?budget=${c.tier.budgetMan}&auto=1`}
                className="tkad-type-title text-accent hover:underline"
              >
                {isKo ? "AI 추천으로 더 보기" : "More in AI recommend"}
              </Link>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
