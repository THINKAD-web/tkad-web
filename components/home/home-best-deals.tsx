import { Link } from "@/i18n/navigation";
import { MediaCard } from "@/components/media/media-card";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import { mapMediaItemToHomeCatalog } from "@/lib/media-catalog-map";
import type { BestDealItem } from "@/lib/best-deals";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";

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
          const dealLabel = isKo ? m.dealLabelKo : m.dealLabelEn;
          const priceLabel =
            m.price > 0
              ? formatCatalogPriceFieldWon(m.price, locale)
              : isKo
                ? "문의"
                : "Inquire";

          return (
            <li key={m.id} className="list-none">
              <MediaCard
                mode="card"
                item={mapMediaItemToHomeCatalog(m)}
                href={mediaItemDetailPath(m)}
                priceLabel={priceLabel}
                isKo={isKo}
                recommendReason={dealLabel}
                showPlanButton
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
