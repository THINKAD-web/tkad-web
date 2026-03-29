import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getMediaById,
  getAllMediaIds,
  typeLabels,
} from "@/lib/media-data";
import MediaDetailExtras from "@/components/media-detail-extras";
import { resolveLocaleParam } from "@/lib/resolve-locale";

type Props = { params: Promise<{ locale: string; id: string }> };

export function generateStaticParams() {
  return getAllMediaIds().map((id) => ({ id: String(id) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const { id } = await params;
  const media = getMediaById(Number(id));
  if (!media) return { title: "Media" };
  const title =
    locale === "ko" ? `${media.name} | THINKAD` : `${media.nameEn} | THINKAD`;
  const description =
    locale === "ko"
      ? `${media.location} · 월 ₩${media.price.toLocaleString()}만원`
      : `${media.locationEn} · ₩${media.price.toLocaleString()}M/mo`;
  return { title, description };
}

export default async function MediaDetailPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const { id: idStr } = await params;
  const id = Number(idStr);
  const media = getMediaById(id);
  if (!media) notFound();

  const t = await getTranslations({ locale, namespace: "media.detail" });
  const isKo = locale === "ko";

  const monthly =
    media.monthlyFootTraffic ??
    Math.round(media.dailyFootTraffic * 30);

  return (
    <>
      <section className="bg-navy py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Link href="/media">
            <Button
              variant="ghost"
              size="sm"
              className="mb-6 -ml-2 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              {t("back")}
            </Button>
          </Link>
          <Badge variant="secondary" className="bg-white/10 text-xs text-white">
            {isKo ? typeLabels[media.type]?.ko : typeLabels[media.type]?.en}
          </Badge>
          <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            {isKo ? media.name : media.nameEn}
          </h1>
          <p className="mt-2 flex items-center gap-2 text-slate-300">
            <MapPin className="h-4 w-4 shrink-0" />
            {isKo ? media.location : media.locationEn}
          </p>
          <p className="mt-4 text-2xl font-bold text-gold">
            ₩{media.price.toLocaleString()}
            <span className="text-sm font-normal text-slate-300">
              {" "}
              {t("perMonth")}
            </span>
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <MediaDetailExtras
            media={media}
            locale={locale}
            labels={{
              locationMap: t("locationMap"),
              openKakao: t("openKakao"),
              openGoogle: t("openGoogle"),
              inquiry: t("inquiry"),
              quote: t("quote"),
            }}
          />

          <h2 className="mb-4 mt-12 text-lg font-bold text-navy">
            {t("specsTitle")}
          </h2>
          <dl className="grid gap-3 rounded-xl border bg-white p-6 sm:grid-cols-2">
            <SpecRow label={t("size")} value={media.size} />
            <SpecRow label={t("resolution")} value={media.resolution} />
            <SpecRow label={t("brightness")} value={media.brightness} />
            <SpecRow
              label={t("operatingHours")}
              value={isKo ? media.operatingHours : media.operatingHoursEn}
            />
            <SpecRow
              label={t("installYear")}
              value={
                media.installYear
                  ? String(media.installYear)
                  : undefined
              }
            />
            <SpecRow
              label={t("targetAge")}
              value={isKo ? media.targetAge : undefined}
            />
          </dl>

          <h2 className="mb-4 mt-10 text-lg font-bold text-navy">
            {t("footTrafficTitle")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {t("daily")}
              </p>
              <p className="mt-1 text-2xl font-bold text-navy">
                {media.dailyFootTraffic.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {t("monthly")}
              </p>
              <p className="mt-1 text-2xl font-bold text-navy">
                {monthly.toLocaleString()}
              </p>
            </div>
          </div>

          <h2 className="mb-4 mt-10 text-lg font-bold text-navy">
            {t("priceTitle")}
          </h2>
          <p className="rounded-xl border bg-white p-5 text-lg font-semibold text-navy">
            ₩{media.price.toLocaleString()}
            {t("priceUnit")}
          </p>

          <h2 className="mb-4 mt-10 text-lg font-bold text-navy">
            {t("historyTitle")}
          </h2>
          <p className="rounded-xl border bg-white p-5 text-sm leading-relaxed text-muted-foreground">
            {(isKo ? media.advertiserHistory : media.advertiserHistoryEn) ||
              t("empty")}
          </p>

          <h2 className="mb-4 mt-10 text-lg font-bold text-navy">
            {t("nearbyTitle")}
          </h2>
          <p className="rounded-xl border bg-white p-5 text-sm leading-relaxed text-muted-foreground">
            {(isKo ? media.nearbyFacilities : media.nearbyFacilitiesEn) ||
              t("empty")}
          </p>

          {(isKo ? media.features : media.featuresEn) && (
            <>
              <h2 className="mb-4 mt-10 text-lg font-bold text-navy">
                {t("featuresTitle")}
              </h2>
              <p className="rounded-xl border bg-white p-5 text-sm leading-relaxed text-muted-foreground">
                {isKo ? media.features : media.featuresEn}
              </p>
            </>
          )}
        </div>
      </section>
    </>
  );
}

function SpecRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-navy">{value}</dd>
    </div>
  );
}
