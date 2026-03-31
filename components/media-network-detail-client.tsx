"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calculator,
  MapPin,
  CircleDollarSign,
  Users,
  Clock,
  Eye,
  Tag,
} from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import {
  NETWORK_TYPE_LABELS,
  computeNetworkMonthlyPrice,
} from "@/lib/media-network-types";

const MediaBrowseMap = dynamic(() => import("@/components/media-browse-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] animate-pulse rounded-xl bg-slate-100" />
  ),
});

export type NetworkDetailPayload = {
  catalogId: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  type: string;
  totalLocations: number;
  regions: string[];
  city: string | null;
  district: string | null;
  minUnits: number;
  pricePerUnit: number | null;
  pricePackage: number | null;
  priceNote: string | null;
  tiers: { units: number; price: number }[];
  image: string | null;
  galleryImages: string[];
  features: string | null;
  locations: {
    id: string;
    name: string;
    address: string | null;
    fullAddress: string | null;
    priceNote: string | null;
    dailyFootfall: number | null;
    note: string | null;
    lat: number | null;
    lng: number | null;
    /** 단일 매체와 연결된 지점인 경우 */
    mediaId?: string | null;
    /** 지점 전용 이미지 (없으면 네트워크 대표 이미지 사용) */
    image?: string | null;
  }[];
  visibilityScore: number | null;
  dailyFootfall: number | null;
  targetAge: string | null;
  effectMemo: string | null;
  operatingHours: string | null;
  tags: string[];
};

export default function MediaNetworkDetailClient({
  locale,
  data,
}: {
  locale: string;
  data: NetworkDetailPayload;
}) {
  const t = useTranslations("networkMedia");
  const isKo = locale === "ko";
  const typeLb = NETWORK_TYPE_LABELS[data.type] ?? {
    ko: data.type,
    en: data.type,
  };
  const [mapSelectedId, setMapSelectedId] = useState<string | null>(null);
  const [selectedTierIdx, setSelectedTierIdx] = useState(0);

  const thumbPool = useMemo(
    () =>
      [data.image, ...data.galleryImages].filter(
        (x): x is string => typeof x === "string" && Boolean(x.trim()),
      ),
    [data.image, data.galleryImages],
  );

  const mapItems: MediaItem[] = useMemo(() => {
    const fallbackImg =
      thumbPool[0] ?? "https://picsum.photos/seed/tkad-net-loc/800/500";
    const basePricePerLocation =
      data.pricePerUnit ??
      (data.pricePackage != null && data.totalLocations > 0
        ? Math.round(data.pricePackage / data.totalLocations)
        : 0);
    return data.locations
      .filter((l) => l.lat != null && l.lng != null)
      .map((l) => ({
        id: l.id,
        name: l.name,
        nameEn: l.name,
        location: l.address ?? "",
        locationEn: l.address ?? "",
        region: "seoul",
        type: "digital",
        price: basePricePerLocation > 0 ? basePricePerLocation : 0,
        lat: l.lat!,
        lng: l.lng!,
        dailyFootTraffic: l.dailyFootfall ?? 0,
        sampleImages: [l.image || fallbackImg].filter(
          (x): x is string => typeof x === "string" && Boolean(x.trim()),
        ),
      }));
  }, [data.locations, data.pricePerUnit, data.pricePackage, data.totalLocations, thumbPool]);

  const heroImg =
    thumbPool[0] ?? "https://picsum.photos/seed/tkad-network-hero/1600/900";

  const tierList =
    data.tiers.length > 0
      ? data.tiers
      : [
          {
            units: Math.max(data.minUnits, 1),
            price: computeNetworkMonthlyPrice(
              {
                pricePackage: data.pricePackage,
                pricePerUnit: data.pricePerUnit,
                minUnits: data.minUnits,
                packageOptions: null,
              },
              data.minUnits,
            ),
          },
        ];

  const quoteHref = `/quote?media=${encodeURIComponent(data.catalogId)}`;
  const contactHref = "/contact";

  const avgLocFootfall =
    data.dailyFootfall ??
    (data.locations.length > 0
      ? Math.round(
          data.locations.reduce(
            (sum, l) => sum + (l.dailyFootfall ?? 0),
            0,
          ) / data.locations.length,
        )
      : null);

  const selectedLocation =
    (mapSelectedId &&
      data.locations.find((loc) => loc.id === mapSelectedId)) ??
    data.locations[0] ??
    null;

  return (
    <>
      {/* 상단 Hero 영역: 네트워크 대표 갤러리 */}
      {heroImg && (
        <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImg}
            alt={isKo ? data.name : data.nameEn ?? data.name}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <section className="bg-white px-4 py-6 sm:px-6 sm:py-8 lg:px-12 lg:py-10 border-b border-gray-100">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <Link href="/media">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 text-navy/70 hover:bg-navy/5 hover:text-navy"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                {t("backToList")}
              </Button>
            </Link>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-gold text-navy">
                {t("sitesCount", { count: data.totalLocations })}
              </Badge>
              <Badge variant="outline" className="border-navy/20 text-xs text-navy">
                {isKo ? typeLb.ko : typeLb.en}
              </Badge>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)] lg:items-start">
            <div className="space-y-4">
              <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
                {isKo ? data.name : data.nameEn ?? data.name}
              </h1>
              {data.description ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {data.description}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                  {[data.city, data.district].filter(Boolean).join(" ")}
                </span>
                {typeLb ? (
                  <>
                    <span className="hidden text-gray-300 sm:inline" aria-hidden>
                      ·
                    </span>
                    <span className="font-medium text-navy/80">
                      {isKo ? typeLb.ko : typeLb.en}
                    </span>
                  </>
                ) : null}
              </div>

              {thumbPool.length > 1 && (
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                  {thumbPool.slice(1, 7).map((src, idx) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${src}-${idx}`}
                      src={src}
                      alt=""
                      className="h-20 w-28 shrink-0 rounded-xl border border-navy/10 object-cover"
                    />
                  ))}
                </div>
              )}
            </div>

            <aside className="space-y-4 rounded-2xl border border-navy/10 bg-slate-50/60 p-4 shadow-sm sm:p-5">
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2 text-navy">
                  <MapPin className="mt-0.5 h-4 w-4 text-gold-dark" />
                  <div className="space-y-1">
                    <p className="font-medium">
                      {[data.city, data.district].filter(Boolean).join(" ")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.regions.map((r) => (
                        <Badge
                          key={r}
                          variant="secondary"
                          className="border border-navy/10 bg-white text-[11px] text-navy"
                        >
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="flex items-start gap-2">
                    <CircleDollarSign className="mt-0.5 h-4 w-4 text-gold-dark" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("pricePerUnitLabel")}
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-navy">
                        {data.pricePerUnit != null
                          ? `₩${data.pricePerUnit.toLocaleString()} / ${t("unitLabel")}`
                          : t("priceEmpty")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CircleDollarSign className="mt-0.5 h-4 w-4 text-gold-dark" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("pricePackageLabel")}
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-navy">
                        {data.pricePackage != null
                          ? `₩${data.pricePackage.toLocaleString()} / ${t("perMonth")}`
                          : t("priceEmpty")}
                      </p>
                    </div>
                  </div>
                </div>

                {data.priceNote ? (
                  <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                    {data.priceNote}
                  </p>
                ) : null}

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="flex items-start gap-2">
                    <Users className="mt-0.5 h-4 w-4 text-gold-dark" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("dailyFootfallLabel")}
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-navy">
                        {avgLocFootfall != null
                          ? `${avgLocFootfall.toLocaleString()}명/일`
                          : t("valueEmpty")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Eye className="mt-0.5 h-4 w-4 text-gold-dark" />
                    <div className="w-full">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("visibilityScoreLabel")}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-gold-dark to-gold"
                            style={{
                              width: `${
                                data.visibilityScore != null
                                  ? Math.min(100, Math.max(0, data.visibilityScore))
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-navy">
                          {data.visibilityScore != null ? data.visibilityScore : "–"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <div className="flex items-start gap-2">
                    <Clock className="mt-0.5 h-4 w-4 text-gold-dark" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("operatingHoursLabel")}
                      </p>
                      <p className="mt-0.5 text-sm text-navy">
                        {data.operatingHours || t("valueEmpty")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="mt-0.5 h-4 w-4 text-gold-dark" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("targetAgeLabel")}
                      </p>
                      <p className="mt-0.5 text-sm text-navy">
                        {data.targetAge || t("valueEmpty")}
                      </p>
                    </div>
                  </div>
                </div>

                {data.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-gold-dark" />
                    {data.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="border-navy/15 bg-white text-[11px] text-navy"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  className="bg-gold font-semibold text-navy hover:bg-gold-dark"
                  asChild
                >
                  <Link href={quoteHref}>
                    <Calculator className="mr-2 h-4 w-4" />
                    {t("getQuote")}
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="border-navy/20 font-semibold text-navy hover:bg-navy/5"
                  asChild
                >
                  <Link href={contactHref}>
                    {isKo ? "문의하기" : "Contact us"}
                  </Link>
                </Button>
              </div>
            </aside>
          </div>
        </div>

        <h2 className="mt-10 text-lg font-bold text-navy">
          {t("coverageMap")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("mapHint")}</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.3fr)]">
          <div className="overflow-hidden rounded-xl border border-navy/10">
            {mapItems.length > 0 ? (
              <MediaBrowseMap
                items={mapItems}
                locale={locale}
                selectedId={mapSelectedId}
                onSelectId={setMapSelectedId}
                fixedMapHeightPx={420}
                showFooterCaption={false}
              />
            ) : (
              <div className="flex h-48 items-center justify-center bg-slate-50 text-sm text-muted-foreground">
                {t("noMapPins")}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {data.locations.length > 0 ? (
              data.locations.map((loc) => {
                const selected = mapSelectedId === loc.id;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => setMapSelectedId(loc.id)}
                    className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                      selected
                        ? "border-gold bg-gold/10"
                        : "border-navy/10 bg-white hover:border-navy/20"
                    }`}
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold-dark">
                      <MapPin className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-navy">{loc.name}</p>
                      {(loc.fullAddress || loc.address) && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {loc.fullAddress || loc.address}
                        </p>
                      )}
                      {loc.priceNote && (
                        <p className="mt-0.5 text-xs text-navy/75">
                          {loc.priceNote}
                        </p>
                      )}
                      {loc.dailyFootfall != null && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {t("locationDailyFootfall", {
                            n: loc.dailyFootfall.toLocaleString(),
                          })}
                        </p>
                      )}
                      {loc.note && (
                        <p className="mt-1 text-[11px] text-navy/70 whitespace-pre-wrap">
                          {loc.note}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("noLocationsFallback")}
              </p>
            )}
          </div>
        </div>

        {/* 지도 하단 팝업 카드: 선택된 지점 요약 */}
        {selectedLocation && (
          <div className="mt-6 rounded-2xl border border-navy/10 bg-white p-4 shadow-md shadow-navy/5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)] sm:items-center">
              <div className="relative overflow-hidden rounded-xl bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    selectedLocation.image ||
                    heroImg ||
                    "https://picsum.photos/seed/tkad-net-popup/960/640"
                  }
                  alt={selectedLocation.name}
                  className="h-full max-h-60 w-full object-cover"
                />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-base font-semibold text-navy">
                    {selectedLocation.name}
                  </p>
                  {selectedLocation.dailyFootfall != null && (
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("locationDailyFootfall", {
                        n: selectedLocation.dailyFootfall.toLocaleString(),
                      })}
                    </span>
                  )}
                </div>
                {(selectedLocation.fullAddress || selectedLocation.address) && (
                  <p className="text-xs text-muted-foreground">
                    {selectedLocation.fullAddress || selectedLocation.address}
                  </p>
                )}
                {selectedLocation.priceNote && (
                  <p className="mt-1 text-xs text-navy/80 whitespace-pre-wrap">
                    {selectedLocation.priceNote}
                  </p>
                )}
                {selectedLocation.note && (
                  <p className="mt-1 text-xs text-navy/80 whitespace-pre-wrap">
                    {selectedLocation.note}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedLocation.mediaId ? (
                    <>
                      <Button
                        size="sm"
                        className="bg-gold font-semibold text-navy hover:bg-gold-dark"
                        asChild
                      >
                        <Link href={`/media/${selectedLocation.mediaId}`}>
                          {t("viewLinkedMedia")}
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-navy/20 font-semibold text-navy hover:bg-navy/5"
                        asChild
                      >
                        <Link href={quoteHref}>{t("getQuote")}</Link>
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      className="bg-gold font-semibold text-navy hover:bg-gold-dark"
                      asChild
                    >
                      <Link href={quoteHref}>
                        <Calculator className="mr-1.5 h-4 w-4" />
                        {t("getQuote")}
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {data.effectMemo && (
          <div className="mt-10 rounded-2xl border border-gold-dark/45 bg-gradient-to-br from-gold-light/40 via-white to-gold/15 px-5 py-5 shadow-md shadow-navy/[0.07] sm:px-7 sm:py-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-navy/75">
              {t("effectMemoLabel")}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-navy/90">
              {data.effectMemo}
            </p>
          </div>
        )}

        {data.features ? (
          <div className="mt-10 rounded-xl border border-navy/10 bg-slate-50/80 p-5">
            <h3 className="text-sm font-bold text-navy">{t("featuresTitle")}</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-navy/80">
              {data.features}
            </p>
          </div>
        ) : null}
      </section>
    </>
  );
}
