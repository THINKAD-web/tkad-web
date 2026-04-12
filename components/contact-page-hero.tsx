import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = { locale: string };

export default async function ContactPageHero({ locale }: Props) {
  setRequestLocale(locale);
  const t = await getTranslations("contact");

  return (
    <section className="bg-navy py-28">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">{t("title")}</h1>
        <p className="mt-2 text-slate-300">{t("subtitle")}</p>
      </div>
    </section>
  );
}
