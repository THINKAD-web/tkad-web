import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { INDUSTRY_SLUGS, type IndustrySlug } from "@/lib/industry-landing";

type Props = {
  slug: IndustrySlug;
  locale: string;
};

export async function IndustryOtherLinks({ slug, locale }: Props) {
  const isKo = locale === "ko";
  const t = await getTranslations("industryPage.common");

  return (
    <section className="tkad-media-links-footer border-t border-border/80 bg-muted py-12 text-foreground sm:py-16">
      <div className="ui-container">
        <p className="tkad-type-title text-muted-foreground sm:text-sm">
          {t("otherIndustriesEyebrow")}
        </p>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {t("otherIndustriesTitle")}
        </h2>
        <ul className="mt-5 flex flex-wrap gap-2">
          {INDUSTRY_SLUGS.filter((s) => s !== slug).map((s) => (
            <li key={s}>
              <Link
                href={`/industry/${s}`}
                className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-border bg-card px-4 py-2.5 text-sm font-medium text-card-foreground shadow-xs transition-colors hover:border-accent hover:bg-muted"
              >
                {isKo
                  ? t(`industryLabels.${s}`)
                  : t(`industryLabels.${s}`)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
