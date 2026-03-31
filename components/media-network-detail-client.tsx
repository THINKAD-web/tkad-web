"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calculator, MapPin } from "lucide-react";
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
  minUnits: number;
  pricePerUnit: number | null;
  pricePackage: number | null;
  tiers: { units: number; price: number }[];
  image: string | null;
  galleryImages: string[];
  features: string | null;
  locations: {
    id: string;
    name: string;
    address: string | null;
    lat: number | null;
    lng: number | null;
  }[];
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
        price: 0,
        lat: l.lat!,
        lng: l.lng!,
        dailyFootTraffic: 0,
        sampleImages: [fallbackImg],
      }));
  }, [data.locations, thumbPool]);

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

  return (
    <>
      <section className="relative aspect-video w-full overflow-hidden bg-navy">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroImg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-10">
          <Link href="/media">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 text-white/90 hover:bg-white/10"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              {t("backToList")}
            </Button>
          </Link>
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge className="bg-gold text-navy">
                {t("sitesCount", { count: data.totalLocations })}
              </Badge>
              <Badge variant="secondary" className="bg-white/20 text-white">
                {isKo ? typeLb.ko : typeLb.en}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold text-white sm:text-4xl">
              {isKo ? data.name : data.nameEn ?? data.name}
            </h1>
            {data.description ? (
              <p className="mt-3 max-w-3xl text-sm text-white/85 sm:text-base">
                {data.description}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {thumbPool.length > 1 && (
        <section className="mx-auto max-w-4xl px-4 pt-4 pb-2 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {thumbPool.slice(1, 8).map((src, idx) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${src}-${idx}`}
                src={src}
                alt=""
                className="h-20 w-32 shrink-0 rounded-xl border border-navy/10 object-cover"
              />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <h2 className="text-lg font-bold text-navy">{t("regionsTitle")}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {data.regions.length > 0 ? (
            data.regions.map((r) => (
              <Badge key={r} variant="secondary" className="text-navy">
                {r}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">
              {t("regionsEmpty")}
            </span>
          )}
        </div>

        <h2 className="mt-10 text-lg font-bold text-navy">
          {t("packagesTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("packagesHint")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tierList.map((tier, i) => (
            <button
              key={`${tier.units}-${tier.price}`}
              type="button"
              onClick={() => setSelectedTierIdx(i)}
              className={`rounded-xl border-2 p-4 text-left transition-colors ${
                selectedTierIdx === i
                  ? "border-gold bg-gold/10"
                  : "border-navy/10 bg-white hover:border-navy/20"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-navy/50">
                {t("tierUnits", { count: tier.units })}
              </p>
              <p className="mt-1 text-xl font-bold text-navy">
                ₩{tier.price.toLocaleString()}
                <span className="text-xs font-normal text-muted-foreground">
                  {t("perMonth")}
                </span>
              </p>
            </button>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button className="bg-gold font-bold text-navy hover:bg-gold-dark" asChild>
            <Link href={quoteHref}>
              <Calculator className="mr-2 h-4 w-4" />
              {t("getQuote")}
            </Link>
          </Button>
        </div>

        <h2 className="mt-14 text-lg font-bold text-navy">
          {t("coverageMap")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("mapHint")}</p>
        <div className="mt-4 overflow-hidden rounded-xl border border-navy/10">
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

        {mapSelectedId ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-navy">
            <MapPin className="h-4 w-4 shrink-0 text-gold-dark" />
            {data.locations.find((l) => l.id === mapSelectedId)?.name ?? ""}
          </p>
        ) : null}

        {data.locations.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-bold text-navy">
              {isKo ? "위치 목록" : "Location list"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isKo
                ? "지도의 마커와 함께 네트워크를 구성하는 주요 위치들을 확인해 보세요."
                : "Review key locations that make up this network alongside the map markers."}
            </p>
            <div className="mt-4 space-y-3">
              {data.locations.map((loc) => (
                <div
                  key={loc.id}
                  className="flex items-start gap-3 rounded-lg border border-navy/10 bg-white px-3 py-2.5 text-sm"
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold-dark">
                    <MapPin className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-navy">{loc.name}</p>
                    {loc.address ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {loc.address}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
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
