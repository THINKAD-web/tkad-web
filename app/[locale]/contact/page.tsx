import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import ContactPageHero from "@/components/contact-page-hero";
import ContactPageContent from "@/components/contact-page-content";

export const dynamic = "force-dynamic";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);

  return (
    <>
      <ContactPageHero locale={locale} />
      <ContactPageContent />
    </>
  );
}
