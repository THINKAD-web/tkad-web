"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Calculator,
  MapPin,
  CircleDollarSign,
  Users,
  Clock,
  Sparkles,
} from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import {
  NETWORK_TYPE_LABELS,
  computeNetworkMonthlyPrice,
} from "@/lib/media-network-types";
import MediaDetailPerformance from "@/components/media-detail-performance";
import { resolvePerformanceMetrics } from "@/lib/media-performance";
import { Badge } from "@/components/ui/badge";

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

  const thumbPool = useMemo(
    () =>
      [data.image, ...data.galleryImages].filter(
        (x): x is string => typeof x === "string" && Boolean(x.trim()),
      ),
    [data.image, data.galleryImages],
  );

  const mapItems: MediaItem[] = useMemo(() => {
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
        sampleImages: [l.image || thumbPool[0]]
          .filter(
          (x): x is string => typeof x === "string" && Boolean(x.trim()),
        ),
      }));
  }, [data.locations, data.pricePerUnit, data.pricePackage, data.totalLocations, thumbPool]);

  const heroImg = thumbPool[0] ?? null;

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

  const performanceMetrics = resolvePerformanceMetrics({
    id: data.catalogId,
    name: data.name,
    nameEn: data.nameEn ?? data.name,
    location: [data.city, data.district].filter(Boolean).join(" "),
    locationEn: [data.city, data.district].filter(Boolean).join(" "),
    region: data.regions[0] ?? "seoul",
    availability: "available",
    subCategory: undefined,
    tags: data.tags,
    city: data.city ?? undefined,
    district: data.district ?? undefined,
    nearbyStations: undefined,
    nearbyLandmarks: undefined,
    type: "network",
    price: data.pricePackage ?? data.pricePerUnit ?? 0,
    pricePeriod: "month",
    lat: mapItems[0]?.lat ?? 37.5665,
    lng: mapItems[0]?.lng ?? 126.978,
    dailyFootTraffic: data.dailyFootfall ?? avgLocFootfall ?? 0,
    monthlyFootTraffic: undefined,
    impressions: undefined,
    reach: undefined,
    frequency: undefined,
    cpm: undefined,
    engagementRate: undefined,
    widthM: undefined,
    heightM: undefined,
    size: undefined,
    resolution: undefined,
    brightness: undefined,
    targetAge: data.targetAge ?? undefined,
    visibilityScore: data.visibilityScore ?? 0,
    features: data.features ?? undefined,
    featuresEn: data.features ?? undefined,
    dailyExposure: undefined,
    sampleImages: thumbPool,
    operatingHours: data.operatingHours ?? undefined,
    operatingHoursEn: data.operatingHours ?? undefined,
    installYear: undefined,
    advertiserHistory: undefined,
    advertiserHistoryEn: undefined,
    nearbyFacilities: undefined,
    nearbyFacilitiesEn: undefined,
    caseStudyPhotos: undefined,
    catalogSource: "network",
    networkSubtype: data.type,
    networkTotalLocations: data.totalLocations,
    networkMinUnits: data.minUnits,
    networkPricePerUnit: data.pricePerUnit,
    networkPricePackage: data.pricePackage,
    networkPackageTiers: data.tiers,
    networkRegionLabels: data.regions,
  });

  return (
    <>
      {/* Hero: bg-navy, 이미지 + 오버레이 + 헤더 */}
      <section className="relative w-full overflow-hidden bg-navy aspect-video">
        {heroImg ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImg}
              alt={isKo ? data.name : data.nameEn ?? data.name}
              className="absolute inset-0 h-full w-full object-cover opacity-80"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/30"
              aria-hidden
            />
          </>
        ) : null}

        <div className="relative z-10 flex h-full min-h-0 flex-col justify-between px-4 py-6 sm:px-6 sm:py-8 lg:px-12 lg:py-10">
          <div className="mx-auto flex w-full max-w-4xl items-start justify-between gap-3">
            <Link href="/media">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 text-slate-200 hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                {t("backToList")}
              </Button>
            </Link>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-gold text-navy">
                {t("sitesCount", { count: data.totalLocations })}
              </Badge>
              <Badge
                variant="outline"
                className="border-white/40 bg-black/30 text-xs font-semibold text-white"
              >
                {isKo ? typeLb.ko : typeLb.en}
              </Badge>
            </div>
          </div>

          <div className="mx-auto grid w-full max-w-4xl gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)] lg:items-end">
            <div className="min-w-0 space-y-3 text-white">
              <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                {isKo ? data.name : data.nameEn ?? data.name}
              </h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-200 sm:text-base">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                  {[data.city, data.district].filter(Boolean).join(" ")}
                </span>
                {typeLb ? (
                  <>
                    <span className="hidden text-slate-400 sm:inline" aria-hidden>
                      ·
                    </span>
                    <span className="font-medium text-gold">
                      {isKo ? typeLb.ko : typeLb.en}
                    </span>
                  </>
                ) : null}
              </p>
              {data.description ? (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-100/90">
                  {data.description}
                </p>
              ) : null}
            </div>

            <aside className="min-w-0 rounded-2xl border border-white/15 bg-black/35 p-4 text-sm text-slate-100 shadow-lg shadow-black/40 backdrop-blur-md sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <CoreFact
                  icon={CircleDollarSign}
                  label={t("pricePackageLabel")}
                  value={
                    <>
                      <span className="block text-lg font-bold tabular-nums text-gold">
                        {data.pricePackage != null
                          ? `₩${data.pricePackage.toLocaleString()}`
                          : t("priceEmpty")}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-200/90">
                        {t("perMonth")}
                      </span>
                    </>
                  }
                />
                <CoreFact
                  icon={CircleDollarSign}
                  label={t("pricePerUnitLabel")}
                  value={
                    <>
                      <span className="block text-lg font-bold tabular-nums text-gold">
                        {data.pricePerUnit != null
                          ? `₩${data.pricePerUnit.toLocaleString()}`
                          : t("priceEmpty")}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-200/90">
                        {t("unitLabel")}
                      </span>
                    </>
                  }
                />
                <CoreFact
                  icon={Users}
                  label={t("dailyFootfallLabel")}
                  value={
                    <span className="block text-base font-semibold tabular-nums text-white">
                      {avgLocFootfall != null
                        ? `${avgLocFootfall.toLocaleString()}명/일`
                        : t("valueEmpty")}
                    </span>
                  }
                />
                <CoreFact
                  icon={Clock}
                  label={t("operatingHoursLabel")}
                  value={
                    <span className="block text-sm text-slate-100">
                      {data.operatingHours || t("valueEmpty")}
                    </span>
                  }
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  className="bg-gold font-semibold text-navy hover:bg-gold-dark"
                  asChild
                >
                  <Link href={quoteHref}>
                    <Calculator className="mr-2 h-4 w-4" />
                    {t("getQuote")}
                  </Link>
                </Button>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* 1) 위치 지도 섹션 */}
      <section className="bg-white pb-16">
        <div className="mx-auto max-w-4xl px-4 pt-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-navy">
                {isKo ? "설치 지점 지도" : "Location Map"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("mapHint")}
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-navy/10 bg-slate-50">
            {/* 지도 본체 */}
            <MediaBrowseMap
              items={mapItems}
              locale={locale}
              selectedId={mapSelectedId}
              onSelectId={setMapSelectedId}
              fixedMapHeightPx={600}
              showFooterCaption={false}
            />

            {/* 데스크톱: 지도 위 좌측 오버레이 목록 */}
            {data.locations.length > 0 && (
              <div className="pointer-events-none absolute inset-y-4 left-4 hidden max-h-[calc(100%-2rem)] w-80 flex-col gap-2 overflow-y-auto rounded-2xl bg-white/92 p-3 shadow-lg shadow-navy/15 backdrop-blur-md md:flex">
                {data.locations.map((loc) => {
                  const selected = mapSelectedId === loc.id;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => setMapSelectedId(loc.id)}
                      className={`pointer-events-auto flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-xs transition-colors ${
                        selected
                          ? "border-gold bg-gold/10"
                          : "border-navy/10 bg-white/95 hover:border-navy/20"
                      }`}
                    >
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/18 text-gold-dark">
                        <MapPin className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-navy">
                          {loc.name}
                        </p>
                        {(loc.fullAddress || loc.address) && (
                          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                            {loc.fullAddress || loc.address}
                          </p>
                        )}
                        {loc.dailyFootfall != null && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {t("locationDailyFootfall", {
                              count: loc.dailyFootfall.toLocaleString(),
                            })}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 데스크톱: 지도 위 우측 하단 팝업 패널 */}
            {selectedLocation && (
              <div className="pointer-events-none absolute bottom-4 right-4 hidden max-w-sm rounded-2xl border border-navy/20 bg-white/95 p-4 text-xs shadow-xl shadow-navy/20 backdrop-blur-md md:block">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-navy">
                    {selectedLocation.name}
                  </p>
                  {(selectedLocation.fullAddress || selectedLocation.address) && (
                    <p className="text-[11px] text-muted-foreground">
                      {selectedLocation.fullAddress || selectedLocation.address}
                    </p>
                  )}
                  {selectedLocation.dailyFootfall != null && (
                    <p className="text-[11px] text-muted-foreground">
                      {t("locationDailyFootfall", {
                        count: selectedLocation.dailyFootfall.toLocaleString(),
                      })}
                    </p>
                  )}
                  {selectedLocation.priceNote && (
                    <p className="mt-1 text-[11px] text-navy/80 whitespace-pre-wrap">
                      {selectedLocation.priceNote}
                    </p>
                  )}
                  {selectedLocation.note && (
                    <p className="mt-1 text-[11px] text-navy/80 whitespace-pre-wrap">
                      {selectedLocation.note}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedLocation.mediaId ? (
                      <>
                        <Button
                          size="sm"
                          className="pointer-events-auto bg-gold font-semibold text-navy hover:bg-gold-dark"
                          asChild
                        >
                          <Link href={`/media/${selectedLocation.mediaId}`}>
                            {t("viewLinkedMedia")}
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="pointer-events-auto border-navy/20 font-semibold text-navy hover:bg-navy/5"
                          asChild
                        >
                          <Link href={quoteHref}>{t("getQuote")}</Link>
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        className="pointer-events-auto bg-gold font-semibold text-navy hover:bg-gold-dark"
                        asChild
                      >
                        <Link href={quoteHref}>
                          <Calculator className="mr-1.5 h-3.5 w-3.5" />
                          {t("getQuote")}
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 모바일: 지도 아래 수평 스크롤 카드 + 팝업 패널 */}
          {data.locations.length > 0 && (
            <div className="mt-4 space-y-3 md:hidden">
              <div className="flex gap-3 overflow-x-auto pb-1">
                {data.locations.map((loc) => {
                  const selected = mapSelectedId === loc.id;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => setMapSelectedId(loc.id)}
                      className={`min-w-[220px] max-w-[260px] rounded-2xl border px-3 py-3 text-left text-xs shadow-sm transition-colors ${
                        selected
                          ? "border-gold bg-gold/10"
                          : "border-navy/10 bg-white hover:border-navy/20"
                      }`}
                    >
                      <p className="truncate text-sm font-semibold text-navy">
                        {loc.name}
                      </p>
                      {(loc.fullAddress || loc.address) && (
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                          {loc.fullAddress || loc.address}
                        </p>
                      )}
                      {loc.dailyFootfall != null && (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {t("locationDailyFootfall", {
                            count: loc.dailyFootfall.toLocaleString(),
                          })}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedLocation && (
                <div className="rounded-2xl border border-navy/10 bg-white p-4 text-xs shadow-sm">
                  <p className="text-sm font-semibold text-navy">
                    {selectedLocation.name}
                  </p>
                  {(selectedLocation.fullAddress || selectedLocation.address) && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {selectedLocation.fullAddress || selectedLocation.address}
                    </p>
                  )}
                  {selectedLocation.dailyFootfall != null && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {t("locationDailyFootfall", {
                        count: selectedLocation.dailyFootfall.toLocaleString(),
                      })}
                    </p>
                  )}
                  {selectedLocation.priceNote && (
                    <p className="mt-1 text-[11px] text-navy/80 whitespace-pre-wrap">
                      {selectedLocation.priceNote}
                    </p>
                  )}
                  {selectedLocation.note && (
                    <p className="mt-1 text-[11px] text-navy/80 whitespace-pre-wrap">
                      {selectedLocation.note}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedLocation.mediaId ? (
                      <Button
                        size="sm"
                        className="bg-gold font-semibold text-navy hover:bg-gold-dark"
                        asChild
                      >
                        <Link href={`/media/${selectedLocation.mediaId}`}>
                          {t("viewLinkedMedia")}
                        </Link>
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant={selectedLocation.mediaId ? "outline" : "default"}
                      className={
                        selectedLocation.mediaId
                          ? "border-navy/20 font-semibold text-navy hover:bg-navy/5"
                          : "bg-gold font-semibold text-navy hover:bg-gold-dark"
                      }
                      asChild
                    >
                      <Link href={quoteHref}>
                        <Calculator className="mr-1.5 h-3.5 w-3.5" />
                        {t("getQuote")}
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 2) 핵심 정보 섹션 */}
      <section className="bg-white py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-6 text-xl font-bold tracking-tight text-navy sm:text-2xl">
            {t("coreInfoTitle")}
          </h2>
          <div className="rounded-2xl border border-navy/10 bg-white p-6 shadow-lg shadow-navy/5 sm:p-7">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <CoreFact
                icon={Users}
                label={t("dailyFootfallLabel")}
                value={
                  <span className="block text-base font-semibold text-navy">
                    {avgLocFootfall != null
                      ? `${avgLocFootfall.toLocaleString()}명/일`
                      : t("valueEmpty")}
                  </span>
                }
              />
              <CoreFact
                icon={Clock}
                label={t("operatingHoursLabel")}
                value={
                  <span className="block text-sm text-navy">
                    {data.operatingHours || t("valueEmpty")}
                  </span>
                }
              />
              <CoreFact
                icon={CircleDollarSign}
                label={t("pricePackageLabel")}
                value={
                  <>
                    <span className="block text-base font-semibold tabular-nums text-gold-dark">
                      {data.pricePackage != null
                        ? `₩${data.pricePackage.toLocaleString()}`
                        : t("priceEmpty")}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">{t("perMonth")}</span>
                  </>
                }
              />
              <CoreFact
                icon={CircleDollarSign}
                label={t("pricePerUnitLabel")}
                value={
                  <>
                    <span className="block text-base font-semibold tabular-nums text-gold-dark">
                      {data.pricePerUnit != null
                        ? `₩${data.pricePerUnit.toLocaleString()}`
                        : t("priceEmpty")}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">{t("unitLabel")}</span>
                  </>
                }
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3) 성과 지표 섹션 */}
      <section className="bg-white py-4 pb-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <MediaDetailPerformance metrics={performanceMetrics} />
        </div>
      </section>

      {/* 4) 상세 설명 섹션 */}
      {(data.effectMemo || data.features) && (
        <section className="bg-white py-10 pb-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-6 text-xl font-bold tracking-tight text-navy sm:text-2xl">
              {t("detailDescriptionTitle")}
            </h2>
            <div className="space-y-6">
              {data.effectMemo && (
                <EffectMemoCallout title={t("effectMemoLabel")}>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-navy/90">
                    {data.effectMemo}
                  </p>
                </EffectMemoCallout>
              )}
              {data.features && (
                <div className="rounded-2xl border border-navy/10 bg-slate-50/80 p-6">
                  <h3 className="text-sm font-semibold text-navy">{t("featuresTitle")}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-navy/85">
                    {data.features}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function CoreFact({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/12 text-gold-dark"
        aria-hidden
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <div className="mt-1.5 min-w-0 text-sm leading-relaxed text-navy">
          {value}
        </div>
      </div>
    </div>
  );
}

function EffectMemoCallout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold-dark/45 bg-gradient-to-br from-gold-light/50 via-white to-gold/18 px-5 py-6 shadow-md shadow-navy/[0.07] ring-1 ring-inset ring-white/60 sm:px-8 sm:py-7">
      <div
        className="pointer-events-none absolute inset-y-5 left-0 w-1 rounded-full bg-gradient-to-b from-gold-dark/75 to-gold-dark/20"
        aria-hidden
      />
      <div className="relative flex gap-4 pl-3 sm:pl-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy/[0.07] text-gold-dark">
          <Sparkles className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-navy/75">
            {title}
          </p>
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </div>
  );
}
