import {
  Building2,
  Monitor,
  Sparkles,
  TrainFront,
  type LucideIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";
import { accentTag } from "@/lib/render-accent-title";
import {
  INDUSTRY_MEDIA_TYPE_KEYS,
  type IndustryMediaTypeKey,
  type IndustrySlug,
} from "@/lib/industry-landing";

const ICONS: Record<IndustryMediaTypeKey, LucideIcon> = {
  type1: Sparkles,
  type2: TrainFront,
  type3: Building2,
};

/** beauty 기본 아이콘 오버라이드 예시 — slug별로 messages에서 다른 키 사용 */
const SLUG_ICON_OVERRIDE: Partial<
  Record<IndustrySlug, Partial<Record<IndustryMediaTypeKey, LucideIcon>>>
> = {
  tech: { type1: Monitor, type2: Building2, type3: Sparkles },
};

type Props = {
  slug: IndustrySlug;
  locale: string;
};

export async function IndustryMediaTypes({ slug }: Props) {
  const t = await getTranslations(`industryPage.slugs.${slug}`);

  return (
    <NeonSection className="pt-10 pb-12 sm:pt-16 sm:pb-20">
      <NeonSectionHead
        number="01"
        kicker={t("mediaTypesKicker")}
        title={t.rich("mediaTypesTitle", { accent: accentTag })}
        meta={t("mediaTypesMeta")}
      />
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {INDUSTRY_MEDIA_TYPE_KEYS.map((key, i) => {
          const Icon =
            SLUG_ICON_OVERRIDE[slug]?.[key] ?? ICONS[key] ?? Sparkles;
          return (
            <article
              key={key}
              className="rounded-[28px] border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 p-6 backdrop-blur tkad-neon-border sm:p-8"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-500">
                  [{String(i + 1).padStart(2, "0")}]
                </span>
                <Icon className="h-6 w-6 text-cyan-300/90" aria-hidden />
              </div>
              <h3 className="text-lg font-black dark:text-white text-gray-900">
                {t(`mediaTypes.${key}.title`)}
              </h3>
              <p className="mt-3 text-sm leading-relaxed dark:text-white">
                {t(`mediaTypes.${key}.reason`)}
              </p>
            </article>
          );
        })}
      </div>
    </NeonSection>
  );
}
