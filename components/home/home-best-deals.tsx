import { Link } from "@/i18n/navigation";
import { MediaCard } from "@/components/brutalist/media-card";
import {
  getPrimaryMediaImageUrl,
  typeLabels,
} from "@/lib/media-data";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import type { BestDealItem } from "@/lib/best-deals";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";

function dealBadgeClass(dealReason: BestDealItem["dealReason"]) {
  if (dealReason === "availability") {
    return "inline-flex rounded-full bg-emerald-500 px-2 py-1 text-xs font-medium text-white shadow-sm";
  }
  if (dealReason === "new") {
    return "inline-flex rounded-full bg-violet-600 px-2 py-1 text-xs font-medium text-white shadow-sm";
  }
  return "inline-flex rounded-md bg-gradient-to-r from-violet-600 to-cyan-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm";
}

export function HomeBestDeals({
  items,
  locale,
}: {
  items: BestDealItem[];
  locale: string;
}) {
  const isKo = locale.startsWith("ko");
  if (items.length === 0) return null;

  return (
    <NeonSection className="tkad-landing-neon">
      <NeonSectionHead
        number="02"
        kicker={isKo ? "Best deal" : "Best deal"}
        title={
          isKo ? (
            <>
              이번 주 <span className="tkad-home-accent-text">베스트 딜</span>
            </>
          ) : (
            <>
              This week’s <span className="tkad-home-accent-text">best deals</span>
            </>
          )
        }
        meta={isKo ? "평균 대비 저렴 · 가용 · 신규" : "Below avg · available · new"}
      />
      <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((m) => {
          const name = isKo ? m.name : m.nameEn || m.name;
          const location = isKo ? m.location : m.locationEn || m.location;
          const typeLabel = typeLabels[m.type]?.[isKo ? "ko" : "en"] ?? m.type;
          const priceText =
            m.price > 0
              ? formatCatalogPriceFieldWon(m.price, locale)
              : isKo
                ? "문의"
                : "Inquire";
          const dealLabel = isKo ? m.dealLabelKo : m.dealLabelEn;

          const topLeft =
            m.dealReason === "price" || m.dealReason === "new" ? (
              <span className={dealBadgeClass(m.dealReason)}>{dealLabel}</span>
            ) : undefined;

          const bottomLeft =
            m.dealReason === "availability" ? (
              <span className={dealBadgeClass("availability")}>{dealLabel}</span>
            ) : undefined;

          return (
            <li key={m.id} className="list-none">
              <MediaCard
                href={mediaItemDetailPath(m)}
                imageSrc={getPrimaryMediaImageUrl(m)}
                imageAlt={name}
                type={typeLabel}
                name={name}
                location={location}
                premium
                glowTheme="purple"
                density="compact"
                topLeft={topLeft}
                bottomLeft={bottomLeft}
                footer={
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      {isKo ? "월 집행가" : "Monthly rate"}
                    </p>
                    <p className="font-display text-[clamp(0.875rem,7cqi,1.375rem)] font-black tabular-nums leading-tight tracking-tight text-foreground">
                      {priceText}
                    </p>
                  </div>
                }
              />
            </li>
          );
        })}
      </ul>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/budget-tool"
          className="text-sm font-bold text-cyan-700 hover:text-cyan-800 dark:text-cyan-300 dark:hover:text-cyan-200"
        >
          {isKo ? "예산별 매체 조합 보기 →" : "Budget-based mixes →"}
        </Link>
        <Link
          href="/pricing-guide"
          className="text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          {isKo ? "가격 가이드 →" : "Pricing guide →"}
        </Link>
      </div>
    </NeonSection>
  );
}
