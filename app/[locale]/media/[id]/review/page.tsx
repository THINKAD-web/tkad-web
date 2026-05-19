import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveMediaForDetail } from "@/lib/public-media-catalog";
import { WriteMediaReviewClient } from "@/components/media-detail/write-media-review-client";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function WriteMediaReviewPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const media = await resolveMediaForDetail(id);
  if (!media) notFound();

  const t = await getTranslations({ locale, namespace: "media.reviews" });

  return (
    <HomeLandingDayNight>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <WriteMediaReviewClient
          mediaId={media.id}
          mediaName={locale === "ko" ? media.name : media.nameEn || media.name}
          labels={{
            title: t("writeTitle"),
            subtitle: t("writeSubtitle"),
            rating: t("rating"),
            reviewTitle: t("reviewTitle"),
            reviewBody: t("reviewBody"),
            campaignPeriod: t("campaignPeriod"),
            industry: t("industry"),
            submit: t("submit"),
            back: t("back"),
            pendingNote: t("pendingNote"),
            loginRequired: t("loginRequired"),
            alreadyReviewed: t("alreadyReviewed"),
          }}
        />
      </div>
    </HomeLandingDayNight>
  );
}
