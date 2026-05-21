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
          const price =
            m.price > 0 ? formatCatalogPriceFieldWon(m.price, locale) : undefined;
          return (
            <li key={m.id} className="list-none">
              <MediaCard
                href={mediaItemDetailPath(m.id)}
                imageSrc={getPrimaryMediaImageUrl(m)}
                imageAlt={name}
                type={typeLabel}
                name={name}
                location={location}
                price={price}
                premium
                glowTheme="purple"
                density="compact"
                topRight={
                  <span className="rounded-md bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
                    {isKo ? m.dealLabelKo : m.dealLabelEn}
                  </span>
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
