import { getTranslations } from "next-intl/server";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";
import { HomeMediaGridServer } from "@/components/home/home-media-grid-server";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import { accentTag } from "@/lib/render-accent-title";

type Props = {
  locale: string;
  displayName: string;
  items: MediaItem[];
};

export async function HomePersonalizedMedia({
  locale,
  displayName,
  items,
}: Props) {
  if (items.length === 0) return null;

  const th = await getTranslations("homePage");

  return (
    <NeonSection className="pt-6 pb-10 sm:pt-10 sm:pb-16 md:pt-14 md:pb-20">
      <NeonSectionHead
        number="00"
        kicker={th("personalizedKicker")}
        title={th.rich("personalizedTitle", {
          name: displayName,
          accent: accentTag,
        })}
        meta={th("personalizedMeta")}
      />
      <div className="mt-6 sm:mt-8">
        <HomeMediaGridServer items={items} locale={locale} density="compact" />
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/recommend"
          className="tkad-neon-cta group inline-flex h-12 items-center justify-center gap-2 rounded-[22px] px-8 text-sm font-black text-white transition-transform hover:-translate-y-1"
        >
          {th("personalizedCtaRecommend")}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          href="/planner"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-[22px] border border-white/14 bg-white/6 px-8 text-sm font-black text-white backdrop-blur transition-all hover:-translate-y-1 hover:border-white/22 hover:bg-white/10"
        >
          {th("personalizedCtaPlanner")}
        </Link>
      </div>
    </NeonSection>
  );
}
