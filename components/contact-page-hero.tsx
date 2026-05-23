import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = { locale: string };

export default async function ContactPageHero({ locale }: Props) {
  setRequestLocale(locale);
  const t = await getTranslations("contact");

  return (
    <section className="bg-hero-void py-24">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
          {`// 06 / Contact`}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-hero-fg sm:text-5xl lg:text-6xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-[12px] tracking-tight text-hero-fg/75 sm:text-sm">
          {t("subtitle")}
        </p>
      </div>
    </section>
  );
}
