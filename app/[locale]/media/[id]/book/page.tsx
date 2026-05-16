import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { InstantBookingWizard } from "@/components/instant-booking/instant-booking-wizard";
import { isInstantBookingEligible } from "@/lib/instant-booking-eligibility";
import { resolveMediaForDetail } from "@/lib/public-media-catalog";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getCurrentUser } from "@/lib/user-session";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function InstantBookPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const { id } = await params;

  const media = await resolveMediaForDetail(id);
  if (!media) notFound();

  const eligibility = isInstantBookingEligible(media);
  if (!eligibility.eligible) notFound();

  const t = await getTranslations("instantBooking");
  const user = await getCurrentUser();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href={`/media/${id}`}
        className="mb-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToMedia")}
      </Link>
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary">
        {t("eyebrow")}
      </p>
      <h1 className="mt-2 text-2xl font-black tracking-tight">{t("title")}</h1>
      <p className="mt-1 text-muted-foreground">{media.name}</p>
      <div className="mt-8">
        <InstantBookingWizard
          media={media}
          locale={locale}
          prefill={{
            name: user?.name,
            email: user?.email,
          }}
        />
      </div>
    </main>
  );
}
