import { routing } from "@/i18n/routing";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { NeonErrorPage } from "@/components/public-chrome/neon-error-page";

type Props = {
  params?: Promise<{ locale?: string }>;
};

export default async function NotFound({ params }: Props) {
  const locale = await resolveLocaleParam(
    (params ??
      Promise.resolve({ locale: routing.defaultLocale })) as Promise<{
      locale: string;
    }>,
  );
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <NeonErrorPage
      code="404"
      eyebrow={t("notFound.eyebrow")}
      title={t("notFound.title")}
      description={t("notFound.description")}
      homeLabel={t("notFound.backHome")}
      secondaryHref="/media"
      secondaryLabel={t("notFound.browseMedia")}
    />
  );
}
