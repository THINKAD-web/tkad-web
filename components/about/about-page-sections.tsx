import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  categoryHeroCtaPrimaryClass,
  categoryHeroCtaSecondaryClass,
  CategoryHeroCtaRow,
} from "@/components/category-explore-hero";
import {
  AboutBrandTimeline,
  ABOUT_TIMELINE_ICONS,
  type AboutTimelineItem,
} from "@/components/about/about-brand-timeline";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = { isKo: boolean; verifiedLabel: string };

function BulletSection({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-4">
        <h2 className="mb-8 text-center text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
          {title}
        </h2>
        <ul className="space-y-4">
          {items.map((item) => (
            <li
              key={item}
              className="flex gap-3 rounded-2xl bg-white px-5 py-4 text-base leading-relaxed text-gray-700 dark:bg-white/5 dark:text-white/80 md:text-lg"
            >
              <span
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--qp-accent)]"
                aria-hidden
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export async function AboutPageSections({ isKo, verifiedLabel }: Props) {
  const t = await getTranslations("about");

  const timelineItems: AboutTimelineItem[] = isKo
    ? [
        {
          year: "2014",
          icon: ABOUT_TIMELINE_ICONS.lightbulb,
          title: "국내 최초 OOH 단가 투명화",
          description: "매체별 단가를 온라인에 공개. 업계 최초",
        },
        {
          year: "2017",
          icon: ABOUT_TIMELINE_ICONS.shoppingBag,
          title: "쇼핑몰형 매체 검색 플랫폼",
          description: "카테고리별 매체 분류, 견적 원스톱 처리",
        },
        {
          year: "2022",
          icon: ABOUT_TIMELINE_ICONS.users,
          title: "미디어렙 공식 인정",
          description: "광고주·대행사·매체사 모두 레퍼런스로 활용",
        },
        {
          year: "2026",
          icon: ABOUT_TIMELINE_ICONS.sparkles,
          title: "AI 플랫폼으로 진화",
          description: "AI 플래너·전자계약·통합 분석 플랫폼 출시",
          current: true,
        },
      ]
    : [
        {
          year: "2014",
          icon: ABOUT_TIMELINE_ICONS.lightbulb,
          title: "First transparent OOH rates in Korea",
          description: "Published per-media pricing online — an industry first",
        },
        {
          year: "2017",
          icon: ABOUT_TIMELINE_ICONS.shoppingBag,
          title: "Store-style media search",
          description: "Category browsing and one-stop quoting",
        },
        {
          year: "2022",
          icon: ABOUT_TIMELINE_ICONS.users,
          title: "Recognized media rep",
          description: "Referenced by advertisers, agencies, and media owners",
        },
        {
          year: "2026",
          icon: ABOUT_TIMELINE_ICONS.sparkles,
          title: "Evolved into an AI platform",
          description: "AI planner, e-contracts, and unified analytics",
          current: true,
        },
      ];

  const companyLeft = [
    [t("companyNameLabel"), t("companyNameValue")],
    [t("companyCeoLabel"), t("companyCeoValue")],
    [t("companyBizLabel"), t("companyBizValue")],
    [t("companyEcommerceLabel"), t("companyEcommerceValue")],
    [t("companyAddressLabel"), t("companyAddressValue")],
  ] as const;

  const companyRight = [
    [t("companyPhoneLabel"), t("companyPhoneValue")],
    [t("companyEmailLabel"), t("companyEmailValue")],
    [t("companyHoursLabel"), t("companyHoursValue")],
  ] as const;

  return (
    <>
      <BulletSection
        title={t("capabilitiesTitle")}
        items={[
          t("capability1", { count: verifiedLabel }),
          t("capability2"),
          t("capability3"),
        ]}
      />

      <BulletSection
        title={t("trustTitle")}
        items={[t("trust1"), t("trust2"), t("trust3")]}
      />

      <AboutBrandTimeline
        title={t("historyTitle")}
        items={timelineItems}
        currentLabel={t("timelineCurrent")}
      />

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
            {t("companyTitle")}
          </h2>
          <div className="grid gap-10 md:grid-cols-2">
            <dl className="space-y-4">
              {companyLeft.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/45">
                    {label}
                  </dt>
                  <dd className="mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-800 dark:text-white/80">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <dl className="space-y-4">
              {companyRight.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/45">
                    {label}
                  </dt>
                  <dd className="mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-800 dark:text-white/80">
                    {label === t("companyEmailLabel") ? (
                      <a
                        href="mailto:sales@tkad.co.kr"
                        className="text-violet-600 hover:underline dark:text-violet-400"
                      >
                        {value}
                      </a>
                    ) : (
                      value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="pb-16 md:pb-24">
        <div className="mx-auto max-w-4xl px-4">
          <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 p-10 text-center">
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              {t("ctaTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-lg whitespace-pre-line text-sm leading-relaxed text-white/90 md:text-base">
              {t("ctaSubtitle", { count: verifiedLabel })}
            </p>
            <CategoryHeroCtaRow className="mt-8 justify-center">
              <Link
                href="/media"
                className={cn(
                  categoryHeroCtaPrimaryClass,
                  "border-0 bg-white text-violet-700 hover:bg-white/95",
                )}
              >
                {t("ctaExplore")}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/contact"
                className={cn(
                  categoryHeroCtaSecondaryClass,
                  "border-white/30 bg-white/10 text-white hover:bg-white/20",
                )}
              >
                {t("ctaContact")}
              </Link>
            </CategoryHeroCtaRow>
          </div>
        </div>
      </section>
    </>
  );
}
