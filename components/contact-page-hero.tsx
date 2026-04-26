import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = { locale: string };

export default async function ContactPageHero({ locale }: Props) {
  setRequestLocale(locale);
  const t = await getTranslations("contact");

  return (
    <section className="bg-bx-black py-24">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bx-accent">
          {`// 06 / Contact`}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-bx-white sm:text-5xl lg:text-6xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl font-mono text-[12px] tracking-tight text-bx-white/75 sm:text-sm">
          {t("subtitle")}
        </p>
      </div>
    </section>
  );
}
