import { Link } from "@/i18n/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NotFound({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-sm font-semibold tracking-wider text-gold uppercase">
          404
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">
          {t("notFound.title")}
        </h1>
        <p className="mt-4 text-sm text-muted-foreground sm:text-base">
          {t("notFound.description")}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link href="/">
            <Button className="btn-gold rounded-full px-6 font-semibold">
              {t("notFound.backHome")}
            </Button>
          </Link>
          <Link href="/media">
            <Button
              variant="outline"
              className="rounded-full border-navy/10 px-6 text-sm font-semibold text-navy hover:bg-navy/5"
            >
              {t("notFound.browseMedia")}
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

