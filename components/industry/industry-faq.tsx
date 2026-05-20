import { getTranslations } from "next-intl/server";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";
import { accentTag } from "@/lib/render-accent-title";
import type { IndustrySlug } from "@/lib/industry-landing";

const FAQ_KEYS = ["q1", "q2", "q3"] as const;
const COMMON_FAQ_KEYS = ["c1", "c2"] as const;

type Props = {
  slug: IndustrySlug;
};

export async function IndustryFaq({ slug }: Props) {
  const t = await getTranslations(`industryPage.slugs.${slug}`);
  const tc = await getTranslations("industryPage.common");

  return (
    <NeonSection className="pt-10 pb-16 sm:pt-16 sm:pb-24">
      <NeonSectionHead
        number="04"
        kicker={t("faqKicker")}
        title={t.rich("faqTitle", { accent: accentTag })}
        meta={t("faqMeta")}
      />
      <div className="mx-auto mt-8 max-w-3xl space-y-3">
        {COMMON_FAQ_KEYS.map((key) => (
          <details
            key={`common-${key}`}
            className="group rounded-2xl border border-white/12 bg-white/5 px-5 py-4 backdrop-blur open:bg-white/8"
          >
            <summary className="cursor-pointer list-none text-sm font-bold text-white marker:content-none [&::-webkit-details-marker]:hidden">
              {tc(`faq.${key}.q`)}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              {tc(`faq.${key}.a`)}
            </p>
          </details>
        ))}
        {FAQ_KEYS.map((key) => (
          <details
            key={key}
            className="group rounded-2xl border border-white/12 bg-white/5 px-5 py-4 backdrop-blur open:bg-white/8"
          >
            <summary className="cursor-pointer list-none text-sm font-bold text-white marker:content-none [&::-webkit-details-marker]:hidden">
              {t(`faq.${key}.q`)}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              {t(`faq.${key}.a`)}
            </p>
          </details>
        ))}
      </div>
    </NeonSection>
  );
}
