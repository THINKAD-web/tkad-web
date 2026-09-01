"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/components/auth/auth-session-provider";
import {
  ArrowLeft,
  Calculator,
  MapPin,
  CircleDollarSign,
  Users,
  Clock,
  Sparkles,
  Globe,
  ChevronDown,
  FileText,
  Layers,
} from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import {
  NETWORK_CATALOG_TYPE_LABELS,
  NETWORK_TYPE_LABELS,
  computeNetworkMonthlyPrice,
  resolveNetworkCatalogType,
  resolveNetworkVenueCode,
} from "@/lib/media-network-types";
import {
  getMediaPackageOptions,
  getQuantityBounds,
  getQuantityUnitMode,
  getValidNetworkPackageTiers,
  networkQuantitySuffixForItem,
} from "@/lib/media-quantity";
import { wonToManwon } from "@/lib/ooh-quote-amount";
import { computeNetworkDailyFootfall } from "@/lib/media-network-footfall";
import MediaDetailPerformance from "@/components/media-detail-performance";
import { resolvePerformanceMetrics } from "@/lib/media-performance";
import { Badge } from "@/components/ui/badge";
import MediaSimilarCarousel from "@/components/media-similar-carousel";

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
    regionMain?: string | null;
    regionSub?: string | null;
    unitCount?: number | null;
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
  similar = [],
}: {
  locale: string;
  data: NetworkDetailPayload;
  similar?: MediaItem[];
}) {
  const t = useTranslations("networkMedia");
  const tDetail = useTranslations("media.detail");
  const isKo = locale === "ko";
  const router = useRouter();
  const catalog = resolveNetworkCatalogType(data.type);
  const catalogLb = NETWORK_CATALOG_TYPE_LABELS[catalog];
  const venue = resolveNetworkVenueCode(data.type, data.tags);
  const venueLb = venue ? NETWORK_TYPE_LABELS[venue] : null;
  const typeLb = venueLb
    ? {
        ko: `${catalogLb.ko} · ${venueLb.ko}`,
        en: `${catalogLb.en} · ${venueLb.en}`,
      }
    : catalogLb;
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
        type: "dooh",
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

  const quoteHref = `/quote?media=${encodeURIComponent(data.catalogId)}`;

  const networkDailyFootfall = useMemo(
    () =>
      computeNetworkDailyFootfall({
        dailyFootfall: data.dailyFootfall,
        totalLocations: data.totalLocations,
        locations: data.locations.map((l) => ({
          dailyFootfall: l.dailyFootfall,
          unitCount: l.unitCount ?? null,
        })),
      }),
    [data.dailyFootfall, data.totalLocations, data.locations],
  );

  const displayNetworkDailyFootfall =
    networkDailyFootfall > 0 ? networkDailyFootfall : null;

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
    dailyFootTraffic: networkDailyFootfall,
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
      {/* Hero: 단일 매체 상세와 동일한 구조 – 상단 이미지, 하단 텍스트 카드 */}
      <section className="bg-navy pb-8 pt-6 sm:pb-10 sm:pt-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 sm:px-6 lg:px-12">
          <div className="flex items-start justify-between gap-3">
            <Link href="/media?features=network">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 text-slate-200 hover:dark:bg-white/10 bg-gray-100 hover:dark:text-white text-gray-900"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                {t("backToList")}
              </Button>
            </Link>
            <div className="flex flex-wrap gap-2">
              <Badge className="gap-1 bg-violet-600 text-white">
                <Globe className="h-3 w-3" />
                {isKo ? "네트워크 매체" : "Network media"}
              </Badge>
              <Badge className="bg-gold text-navy">
                {t("sitesCount", { count: data.totalLocations })}
              </Badge>
              <Badge
                variant="outline"
                className="border-white/40 dark:bg-black bg-white/30 text-xs font-semibold dark:text-white text-gray-900"
              >
                {isKo ? typeLb.ko : typeLb.en}
              </Badge>
            </div>
          </div>

          {heroImg ? (
            <div className="relative flex h-[220px] items-center justify-center rounded-xl dark:bg-black bg-white/40 dark:bg-white/8 bg-gray-100 sm:h-[260px] lg:h-[280px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImg}
                alt={isKo ? data.name : (data.nameEn || data.name) ?? data.name}
                className="mx-auto max-h-full w-auto max-w-full object-contain"
              />
            </div>
          ) : null}

          <div className="mx-auto grid w-full max-w-4xl gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)] lg:items-end">
            <div className="min-w-0 space-y-3 dark:text-white text-gray-900">
              <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                {isKo ? data.name : (data.nameEn || data.name) ?? data.name}
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

            <aside className="min-w-0 rounded-2xl border dark:border-white/15 border-gray-200 dark:bg-black bg-white/35 p-4 text-sm text-slate-100 shadow-lg shadow-black/40 backdrop-blur-md sm:p-5">
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
                    <span className="block text-base font-semibold tabular-nums dark:text-white text-gray-900">
                      {displayNetworkDailyFootfall != null
                        ? `${displayNetworkDailyFootfall.toLocaleString()}명/일`
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
            </aside>
          </div>
        </div>
      </section>

      {/* 0) 핵심 카드 3개 + 가격 계산기 */}
      <section className="bg-white pt-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <NetworkStatCard
              label={isKo ? "대당 단가" : "Per unit"}
              value={
                data.pricePerUnit != null
                  ? `₩${data.pricePerUnit.toLocaleString()}`
                  : data.pricePackage != null
                    ? `₩${data.pricePackage.toLocaleString()}`
                    : "—"
              }
              sub={isKo ? "월 기준" : "/ month"}
              accent
            />
            <NetworkStatCard
              label={isKo ? "총 설치 개소" : "Total sites"}
              value={`${data.totalLocations.toLocaleString()}${isKo ? "개소" : ""}`}
              sub={
                isKo
                  ? `${data.regions.length}개 지역`
                  : `${data.regions.length} regions`
              }
            />
            <NetworkStatCard
              label={isKo ? "최소 수량" : "Min. units"}
              value={`${data.minUnits.toLocaleString()}${isKo ? "대~" : "+"}`}
              sub={isKo ? "최소 집행 단위" : "minimum order"}
            />
          </div>

          <NetworkPriceCalculator
            data={data}
            isKo={isKo}
            router={router}
          />
        </div>
      </section>

      {/* 1) 위치 지도 섹션 */}
      <section className="bg-white pb-16 pt-12">
        <div className="mx-auto max-w-4xl px-4 pt-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-navy">
                {isKo ? "위치 지도" : "Location Map"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("mapHint")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-gold font-semibold text-navy hover:bg-gold-dark"
                asChild
              >
                <Link href={quoteHref}>
                  <Calculator className="mr-1.5 h-3.5 w-3.5" />
                  {isKo ? "견적 받기" : "Get Quote"}
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-navy/20 font-semibold text-navy hover:bg-navy/5"
                asChild
              >
                <Link href={`/contact?media=${encodeURIComponent(data.catalogId)}`}>
                  {isKo ? "문의하기" : "Inquire"}
                </Link>
              </Button>
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
                    {displayNetworkDailyFootfall != null
                      ? `${displayNetworkDailyFootfall.toLocaleString()}명/일`
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
        <section className="bg-white py-10 pb-16">
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



      {/* 5) 패키지 추천 */}
      <NetworkPackages data={data} isKo={isKo} quoteHref={quoteHref} />

      {/* 6) 지역별 설치 현황 */}
      <RegionInstallTable data={data} isKo={isKo} />

      {/* 7) FAQ */}
      <NetworkFaq data={data} isKo={isKo} />

      {similar.length > 0 && (
        <section className="bg-white pb-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <MediaSimilarCarousel
              items={similar}
              isKo={isKo}
              title={tDetail("similarTitle")}
            />
          </div>
        </section>
      )}
    </>
  );
}

/** 핵심 통계 카드 */
function NetworkStatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        accent
          ? "border-gold/40 bg-gold/8"
          : "border-navy/10 bg-white shadow-sm shadow-navy/5"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1.5 text-2xl font-black tabular-nums tracking-tight ${
          accent ? "text-gold-dark" : "text-navy"
        }`}
      >
        {value}
      </p>
      {sub ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
      ) : null}
    </div>
  );
}

const NETWORK_PERIODS = [1, 3, 6] as const;

/** 가격 계산기 — 수량/기간 선택 → 월·총액 자동 계산 → 견적 생성 */
function NetworkPriceCalculator({
  data,
  isKo,
  router,
}: {
  data: NetworkDetailPayload;
  isKo: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  const mediaItem = useMemo(() => networkDetailToMediaItem(data), [data]);
  const unitMode = getQuantityUnitMode(mediaItem);
  const packageTiers = getValidNetworkPackageTiers(mediaItem);
  const packageOptions = getMediaPackageOptions(mediaItem, isKo);
  const quantitySuffix = networkQuantitySuffixForItem(mediaItem, isKo);
  const bounds = getQuantityBounds(mediaItem);
  const minUnits = bounds.min;
  const sliderMax =
    bounds.max != null
      ? bounds.max
      : Math.max(minUnits * 10, data.totalLocations || 0, 1000);
  const [units, setUnits] = useState<number>(bounds.default);
  const [months, setMonths] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const { user: sessionUser } = useAuthSession();

  const monthly = useMemo(
    () =>
      computeNetworkMonthlyPrice(
        {
          pricePackage: data.pricePackage,
          pricePerUnit: data.pricePerUnit,
          minUnits,
          packageOptions: data.tiers,
        },
        units,
      ),
    [data.pricePackage, data.pricePerUnit, data.tiers, minUnits, units],
  );
  const total = monthly * months;

  const clampUnits = (n: number) => {
    const hi = bounds.max ?? sliderMax;
    return Math.max(minUnits, Math.min(hi, Math.round(n) || minUnits));
  };

  const createQuote = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const user = sessionUser?.email
        ? (sessionUser as {
            name?: string;
            email: string;
            company?: string | null;
          })
        : null;
      const period = isKo ? `${months}개월` : `${months} month${months > 1 ? "s" : ""}`;
      if (!user?.email) {
        const back = `/media/network/${encodeURIComponent(
          data.catalogId,
        )}?createQuote=1&units=${units}`;
        router.push(`/login?redirect=${encodeURIComponent(back)}`);
        return;
      }
      const res = await fetch("/api/quote/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaIds: [data.catalogId],
          networkUnits: { [data.catalogId]: units },
          clientName: user.name || user.email,
          clientEmail: user.email,
          clientCompany: user.company || undefined,
          period,
          budgetMax: monthly > 0 ? wonToManwon(monthly) : undefined,
          locale: isKo ? "ko" : "en",
        }),
      });
      const d = (await res.json()) as { ok?: boolean; data?: { id?: string } };
      if (!res.ok || !d?.ok || !d.data?.id) throw new Error("create failed");
      router.push(`/quote/${d.data.id}/preview`);
    } catch {
      router.push(
        `/quote?media=${encodeURIComponent(data.catalogId)}&units=${units}`,
      );
    } finally {
      setBusy(false);
    }
  }, [busy, data.catalogId, isKo, months, monthly, router, sessionUser, units]);

  // 로그인 후 ?createQuote=1 복귀 시 수량 복원 + 자동 견적 생성
  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current || typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("createQuote") !== "1") return;
    resumedRef.current = true;
    const u = Number(sp.get("units"));
    if (Number.isFinite(u) && u > 0) setUnits(clampUnits(u));
    const url = new URL(window.location.href);
    url.searchParams.delete("createQuote");
    window.history.replaceState({}, "", url.toString());
    void createQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mt-5 rounded-3xl border border-gold/40 bg-gradient-to-br from-gold-light/40 via-white to-white p-5 shadow-lg shadow-navy/5 sm:p-7">
      <div className="flex items-center gap-2">
        <Calculator className="h-5 w-5 text-gold-dark" />
        <h2 className="text-lg font-bold text-navy sm:text-xl">
          {isKo ? "가격 계산기" : "Price calculator"}
        </h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {isKo
          ? "수량과 기간을 선택하면 월 비용과 총액이 자동 계산됩니다."
          : "Pick units and duration to see monthly and total cost."}
      </p>

      {/* 수량 */}
      <div className="mt-5">
        <div className="flex items-end justify-between gap-3">
          <label className="text-sm font-semibold text-navy">
            {unitMode === "package"
              ? isKo
                ? `패키지 (${quantitySuffix})`
                : "Package units"
              : isKo
                ? "설치 수량"
                : "Units"}
          </label>
          {unitMode === "unit" ? (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={minUnits}
                max={sliderMax}
                value={units}
                onChange={(e) => setUnits(clampUnits(Number(e.target.value)))}
                className="w-28 rounded-lg border border-navy/15 bg-white px-3 py-1.5 text-right text-sm font-bold tabular-nums text-navy outline-none focus:border-gold"
              />
              <span className="text-sm text-muted-foreground">
                {quantitySuffix}
              </span>
            </div>
          ) : (
            <span className="text-sm font-bold tabular-nums text-navy">
              {units.toLocaleString()}
              {isKo ? quantitySuffix : " units"}
            </span>
          )}
        </div>
        {unitMode === "package" && packageTiers.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {packageOptions.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => opt.units != null && setUnits(opt.units)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  units === opt.units
                    ? "border-gold bg-gold/15 text-gold-dark"
                    : "border-navy/15 bg-white text-navy hover:border-gold"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : (
          <>
            <input
              type="range"
              min={minUnits}
              max={sliderMax}
              step={Math.max(1, Math.round(minUnits))}
              value={units}
              onChange={(e) => setUnits(clampUnits(Number(e.target.value)))}
              className="mt-3 w-full cursor-pointer accent-gold"
              aria-label={isKo ? "설치 수량" : "Units"}
            />
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>{minUnits.toLocaleString()}</span>
              <span>{sliderMax.toLocaleString()}+</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[10, 100, 1000, 10000].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setUnits(clampUnits(q))}
                  className="rounded-full border border-navy/15 bg-white px-3 py-1 text-xs font-semibold text-navy hover:border-gold"
                >
                  {q.toLocaleString()}
                  {isKo ? "대" : ""}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 기간 */}
      <div className="mt-5">
        <label className="text-sm font-semibold text-navy">
          {isKo ? "집행 기간" : "Duration"}
        </label>
        <div className="mt-2 flex gap-2">
          {NETWORK_PERIODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMonths(m)}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                months === m
                  ? "border-gold bg-gold/15 text-gold-dark"
                  : "border-navy/15 bg-white text-navy hover:border-navy/30"
              }`}
            >
              {isKo ? `${m}개월` : `${m} mo`}
            </button>
          ))}
        </div>
      </div>

      {/* 결과 */}
      <div className="mt-5 rounded-2xl border border-navy/10 bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {isKo ? "월 비용" : "Monthly"}
          </span>
          <span className="text-lg font-bold tabular-nums text-navy">
            ₩{monthly.toLocaleString()}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-navy/10 pt-2">
          <span className="text-sm font-semibold text-navy">
            {isKo ? `총액 (${months}개월)` : `Total (${months} mo)`}
          </span>
          <span className="text-2xl font-black tabular-nums text-gold-dark">
            ₩{total.toLocaleString()}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {isKo ? "부가세 별도 · 구간 단가 적용" : "VAT excl. · tiered pricing"}
        </p>
      </div>

      <Button
        type="button"
        disabled={busy}
        onClick={() => void createQuote()}
        className="mt-4 w-full bg-gold py-6 text-base font-bold text-navy hover:bg-gold-dark"
      >
        <FileText className="mr-2 h-4 w-4" />
        {busy
          ? isKo
            ? "견적서 생성 중…"
            : "Creating…"
          : isKo
            ? "이 구성으로 견적 받기"
            : "Get a quote for this setup"}
      </Button>
    </div>
  );
}

/** 패키지 추천 3개 (스타터/스탠다드/프리미엄) */
function NetworkPackages({
  data,
  isKo,
  quoteHref,
}: {
  data: NetworkDetailPayload;
  isKo: boolean;
  quoteHref: string;
}) {
  const minUnits = Math.max(1, data.minUnits || 1);
  const monthlyFor = (u: number) =>
    computeNetworkMonthlyPrice(
      {
        pricePackage: data.pricePackage,
        pricePerUnit: data.pricePerUnit,
        minUnits,
        packageOptions: data.tiers,
      },
      u,
    );

  // tier 가 있으면 tier 기반, 없으면 minUnits 배수로 3구간 구성
  const bands =
    data.tiers.length >= 3
      ? [data.tiers[0], data.tiers[Math.floor(data.tiers.length / 2)], data.tiers[data.tiers.length - 1]]
      : [
          { units: minUnits, price: monthlyFor(minUnits) },
          { units: minUnits * 10, price: monthlyFor(minUnits * 10) },
          { units: minUnits * 50, price: monthlyFor(minUnits * 50) },
        ];

  const meta = isKo
    ? [
        { name: "스타터", desc: "소규모 테스트 집행" },
        { name: "스탠다드", desc: "지역 집중 캠페인", popular: true },
        { name: "프리미엄", desc: "전국 대규모 노출" },
      ]
    : [
        { name: "Starter", desc: "Small test run" },
        { name: "Standard", desc: "Regional campaign", popular: true },
        { name: "Premium", desc: "Nationwide reach" },
      ];

  return (
    <section className="bg-slate-50/70 py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-2">
          <Layers className="h-5 w-5 text-gold-dark" />
          <h2 className="text-xl font-bold tracking-tight text-navy sm:text-2xl">
            {isKo ? "패키지 추천" : "Recommended packages"}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {bands.map((b, i) => {
            const m = meta[i];
            return (
              <div
                key={m.name}
                className={`relative rounded-2xl border p-5 ${
                  m.popular
                    ? "border-gold bg-white shadow-lg shadow-gold/20 ring-2 ring-gold/30"
                    : "border-navy/10 bg-white shadow-sm"
                }`}
              >
                {m.popular ? (
                  <span className="absolute -top-2.5 left-5 rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-bold text-navy">
                    {isKo ? "인기" : "Popular"}
                  </span>
                ) : null}
                <p className="text-sm font-bold text-navy">{m.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{m.desc}</p>
                <p className="mt-3 text-2xl font-black tabular-nums text-gold-dark">
                  ₩{b.price.toLocaleString()}
                  <span className="text-xs font-normal text-muted-foreground">
                    {isKo ? "/월" : "/mo"}
                  </span>
                </p>
                <p className="mt-1 text-xs text-navy">
                  {b.units.toLocaleString()}
                  {isKo ? "대 기준" : " units"}
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="mt-4 w-full border-gold/40 font-semibold text-gold-dark hover:bg-gold/10"
                >
                  <Link href={`${quoteHref}&units=${b.units}`}>
                    {isKo ? "견적 받기" : "Get quote"}
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** 지역별 설치 현황 테이블 (시도/세부지역, 접기/펼치기) */
function RegionInstallTable({
  data,
  isKo,
}: {
  data: NetworkDetailPayload;
  isKo: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const rows = useMemo(() => {
    const map = new Map<
      string,
      { main: string; sub: string; units: number }
    >();
    for (const l of data.locations) {
      const main = (l.regionMain ?? "").trim() || (isKo ? "기타" : "Other");
      const sub = (l.regionSub ?? "").trim() || "—";
      const key = `${main}|${sub}`;
      const units = Math.max(1, l.unitCount ?? 1);
      const cur = map.get(key);
      if (cur) cur.units += units;
      else map.set(key, { main, sub, units });
    }
    return Array.from(map.values()).sort(
      (a, b) => b.units - a.units || a.main.localeCompare(b.main),
    );
  }, [data.locations, isKo]);

  if (rows.length === 0) return null;
  const visible = expanded ? rows : rows.slice(0, 8);
  const totalUnits = rows.reduce((s, r) => s + r.units, 0);

  return (
    <section className="bg-white py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-gold-dark" />
          <h2 className="text-xl font-bold tracking-tight text-navy sm:text-2xl">
            {isKo ? "지역별 설치 현황" : "Installation by region"}
          </h2>
        </div>
        <div className="overflow-hidden rounded-2xl border border-navy/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 font-semibold">{isKo ? "시도" : "Region"}</th>
                <th className="px-4 py-2.5 font-semibold">{isKo ? "세부지역" : "District"}</th>
                <th className="px-4 py-2.5 text-right font-semibold">{isKo ? "개소 수" : "Sites"}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={`${r.main}-${r.sub}`} className="border-t border-navy/8">
                  <td className="px-4 py-2.5 font-medium text-navy">{r.main}</td>
                  <td className="px-4 py-2.5 text-navy/80">{r.sub}</td>
                  <td className="px-4 py-2.5 text-right font-bold tabular-nums text-navy">
                    {r.units.toLocaleString()}
                    {isKo ? "개소" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-navy/15 bg-gold/8">
                <td className="px-4 py-2.5 font-bold text-navy" colSpan={2}>
                  {isKo ? "합계" : "Total"}
                </td>
                <td className="px-4 py-2.5 text-right font-black tabular-nums text-gold-dark">
                  {totalUnits.toLocaleString()}
                  {isKo ? "개소" : ""}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        {rows.length > 8 ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-dark hover:underline"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
            {expanded
              ? isKo
                ? "접기"
                : "Collapse"
              : isKo
                ? `전체 ${rows.length}개 지역 보기`
                : `Show all ${rows.length} regions`}
          </button>
        ) : null}
      </div>
    </section>
  );
}

/** 네트워크 매체 FAQ */
function NetworkFaq({
  data,
  isKo,
}: {
  data: NetworkDetailPayload;
  isKo: boolean;
}) {
  const items = isKo
    ? [
        {
          q: "최소 몇 대부터 집행할 수 있나요?",
          a: `최소 ${data.minUnits.toLocaleString()}대부터 집행 가능하며, 수량이 늘수록 대당 단가가 유리해집니다.`,
        },
        {
          q: "지점(설치 위치)을 직접 고를 수 있나요?",
          a: "지역(시도/세부지역) 단위로 선택 가능하며, 특정 지점 지정은 견적 단계에서 협의합니다.",
        },
        {
          q: "소재 교체나 집행 기간 연장이 가능한가요?",
          a: "월 단위 계약을 기본으로 하며, 기간 연장·소재 교체는 담당 매니저를 통해 진행됩니다.",
        },
        {
          q: "견적은 어떻게 받나요?",
          a: "위 가격 계산기에서 수량·기간을 선택하고 ‘이 구성으로 견적 받기’를 누르면 견적서가 생성됩니다.",
        },
      ]
    : [
        {
          q: "What is the minimum order?",
          a: `From ${data.minUnits.toLocaleString()} units. The more units, the better the per-unit rate.`,
        },
        {
          q: "Can I choose specific locations?",
          a: "You can target by region; specific sites are arranged during quoting.",
        },
        {
          q: "Can I extend the period or swap creatives?",
          a: "Monthly contracts by default; extensions and swaps go through your manager.",
        },
        {
          q: "How do I get a quote?",
          a: "Use the calculator above and click ‘Get a quote for this setup’.",
        },
      ];

  return (
    <section className="bg-slate-50/70 py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-5 text-xl font-bold tracking-tight text-navy sm:text-2xl">
          FAQ
        </h2>
        <div className="space-y-2">
          {items.map((it) => (
            <details
              key={it.q}
              className="group rounded-xl border border-navy/10 bg-white px-4 py-3"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-navy">
                {it.q}
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-navy/80">{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
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
