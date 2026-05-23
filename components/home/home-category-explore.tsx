import { Link } from "@/i18n/navigation";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";
import {
  FEATURED_MEDIA_CATEGORY_SLUGS,
  FEATURED_TARGET_SLUGS,
} from "@/lib/media-category-landing";
import {
  categoryLabel,
  getMediaCategoryBySlug,
  getTargetCategoryBySlug,
  targetLabel,
} from "@/lib/media-categories";

type Props = {
  locale: string;
};

const MEDIA_CARD_META: Record<
  (typeof FEATURED_MEDIA_CATEGORY_SLUGS)[number],
  { icon: string }
> = {
  subway: { icon: "🚇" },
  billboard: { icon: "📺" },
  dooh: { icon: "💡" },
  campus: { icon: "🎓" },
  retail: { icon: "🏬" },
  local: { icon: "📍" },
};

const TARGET_CARD_META: Record<
  (typeof FEATURED_TARGET_SLUGS)[number],
  { icon: string }
> = {
  brand: { icon: "🏢" },
  fandom: { icon: "🎤" },
  small_business: { icon: "🏘" },
  event: { icon: "🛍" },
};

export function HomeCategoryExplore({ locale }: Props) {
  const isKo = locale.startsWith("ko");

  return (
    <NeonSection className="pt-10 pb-16 sm:pt-16 sm:pb-24">
      <NeonSectionHead
        number="—"
        kicker={isKo ? "카테고리" : "Categories"}
        title={
          isKo ? (
            <>
              목적별로{" "}
              <span className="tkad-home-accent-text">광고 찾기</span>
            </>
          ) : (
            <>
              Find ads by{" "}
              <span className="tkad-home-accent-text">purpose</span>
            </>
          )
        }
        meta={
          isKo
            ? "매체 유형 · 캠페인 목적별 랜딩"
            : "Browse by media type or campaign goal"
        }
      />

      <div className="mt-8">
        <p className="mb-3 text-sm font-semibold text-muted-foreground">
          {isKo ? "매체 유형별" : "By media type"}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FEATURED_MEDIA_CATEGORY_SLUGS.map((slug) => {
            const meta = MEDIA_CARD_META[slug];
            const node = getMediaCategoryBySlug(slug);
            return (
              <Link
                key={slug}
                href={`/media/category/${slug}`}
                className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white/80 px-4 py-6 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-500/40 dark:border-white/12 dark:bg-white/5"
              >
                <span className="text-3xl" aria-hidden>
                  {node?.icon ?? meta.icon}
                </span>
                <span className="text-sm font-bold text-foreground">
                  {categoryLabel(slug, locale)}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-10">
        <p className="mb-3 text-sm font-semibold text-muted-foreground">
          {isKo ? "누가 광고하나요?" : "Who is advertising?"}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FEATURED_TARGET_SLUGS.map((slug) => {
            const meta = TARGET_CARD_META[slug];
            const node = getTargetCategoryBySlug(slug);
            const href = slug === "fandom" ? "/special/fandom" : `/target/${slug}`;
            return (
              <Link
                key={slug}
                href={href}
                className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white/80 px-4 py-6 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-violet-500/40 dark:border-white/12 dark:bg-white/5"
              >
                <span className="text-3xl" aria-hidden>
                  {node?.icon ?? meta.icon}
                </span>
                <span className="text-sm font-bold text-foreground">
                  {targetLabel(slug, locale)}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </NeonSection>
  );
}
