"use client";

import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  MapPin,
  Monitor,
  BadgeCheck,
  Eye,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { typeLabels, type MediaItem, resolveMediaGallery } from "@/lib/media-data";
import SolutionCtaButton from "@/components/solution-cta-button";

export default function ComparePageClient({ items }: { items: MediaItem[] }) {
  const locale = useLocale();
  const isKo = locale === "ko";

  if (items.length < 2) {
    return (
      <section className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <Monitor className="mb-4 h-16 w-16 text-navy/15" />
        <h1 className="text-2xl font-bold text-navy">
          {isKo ? "비교할 매체를 선택해주세요" : "Select media to compare"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isKo
            ? "매체 검색 페이지에서 2~3개의 매체를 선택하세요"
            : "Select 2-3 media from the media search page"}
        </p>
        <Link href="/media" className="mt-6">
          <Button className="rounded-full bg-gold px-6 font-bold text-navy hover:bg-gold-dark">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {isKo ? "매체 검색으로" : "Go to Media Search"}
          </Button>
        </Link>
      </section>
    );
  }

  const rows: {
    label: string;
    render: (m: MediaItem) => React.ReactNode;
  }[] = [
    {
      label: isKo ? "유형" : "Type",
      render: (m) => (
        <Badge variant="secondary" className="bg-navy/5 text-xs text-navy">
          {isKo ? typeLabels[m.type]?.ko : typeLabels[m.type]?.en}
        </Badge>
      ),
    },
    {
      label: isKo ? "위치" : "Location",
      render: (m) => (
        <span className="flex items-center gap-1 text-sm">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          {isKo ? m.location : m.locationEn}
        </span>
      ),
    },
    {
      label: isKo ? "좌표" : "Coordinates",
      render: (m) => (
        <span className="font-mono text-xs text-muted-foreground">
          {m.lat.toFixed(4)}, {m.lng.toFixed(4)}
        </span>
      ),
    },
    {
      label: isKo ? "월 가격" : "Monthly price",
      render: (m) => (
        <span className="text-lg font-bold text-navy">
          ₩{m.price.toLocaleString()}
          <span className="text-xs font-normal text-muted-foreground">
            {isKo ? "만원" : " (10K)"}
          </span>
        </span>
      ),
    },
    {
      label: isKo ? "일일 유동" : "Daily foot traffic",
      render: (m) => (
        <span className="flex items-center gap-1 text-sm font-semibold text-navy">
          <Eye className="h-3.5 w-3.5 text-gold" />
          {m.dailyFootTraffic.toLocaleString()}
        </span>
      ),
    },
    {
      label: isKo ? "월간 유동(추정)" : "Monthly foot traffic (est.)",
      render: (m) => (
        <span className="text-sm font-semibold text-navy">
          {(m.monthlyFootTraffic ?? m.dailyFootTraffic * 30).toLocaleString()}
        </span>
      ),
    },
    {
      label: isKo ? "일일 노출(표기)" : "Daily exposure (label)",
      render: (m) => (
        <span className="text-sm text-navy">{m.dailyExposure || "—"}</span>
      ),
    },
    {
      label: isKo ? "크기" : "Size",
      render: (m) => <span className="text-sm">{m.size || "—"}</span>,
    },
    {
      label: isKo ? "해상도" : "Resolution",
      render: (m) => <span className="text-sm">{m.resolution || "—"}</span>,
    },
    {
      label: isKo ? "밝기" : "Brightness",
      render: (m) => <span className="text-sm">{m.brightness || "—"}</span>,
    },
    {
      label: isKo ? "운영시간" : "Hours",
      render: (m) => (
        <span className="text-sm">
          {(isKo ? m.operatingHours : m.operatingHoursEn) || "—"}
        </span>
      ),
    },
    {
      label: isKo ? "설치연도" : "Install year",
      render: (m) => (
        <span className="text-sm">
          {m.installYear ? String(m.installYear) : "—"}
        </span>
      ),
    },
    {
      label: isKo ? "광고주 이력" : "Advertiser history",
      render: (m) => (
        <span className="text-sm leading-snug">
          {(isKo ? m.advertiserHistory : m.advertiserHistoryEn) || "—"}
        </span>
      ),
    },
    {
      label: isKo ? "주변 시설" : "Nearby",
      render: (m) => (
        <span className="text-sm leading-snug">
          {(isKo ? m.nearbyFacilities : m.nearbyFacilitiesEn) || "—"}
        </span>
      ),
    },
    {
      label: isKo ? "특징" : "Features",
      render: (m) => (
        <span className="flex items-start gap-1 text-left text-sm">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
          {(isKo ? m.features : m.featuresEn) || "—"}
        </span>
      ),
    },
  ];

  return (
    <>
      <section className="bg-navy py-28">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white">
            {isKo ? "매체 비교" : "Media Comparison"}
          </h1>
          <p className="mt-2 text-slate-300">
            {isKo
              ? "선택한 매체를 한눈에 비교해보세요"
              : "Compare selected media at a glance"}
          </p>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Link href="/media">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <ArrowLeft className="mr-1 h-4 w-4" />
                {isKo ? "매체 검색으로 돌아가기" : "Back to Media Search"}
              </Button>
            </Link>
          </div>

          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `180px repeat(${items.length}, minmax(0,1fr))`,
            }}
          >
            <div />
            {items.map((media) => (
              <div
                key={media.id}
                className="overflow-hidden rounded-xl border bg-white shadow-sm"
              >
                <div className="relative flex h-32 items-center justify-center overflow-hidden bg-gradient-to-br from-navy/5 to-navy/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveMediaGallery(media)[0]}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/50 to-transparent" />
                  <Monitor className="relative z-0 h-10 w-10 text-white/25" />
                  <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    <BadgeCheck className="h-3 w-3" />
                    Verified
                  </div>
                </div>
                <div className="space-y-2 p-4 text-center">
                  <h3 className="font-bold text-navy">
                    {isKo ? media.name : media.nameEn}
                  </h3>
                  <Link href={`/media/${media.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs font-semibold"
                    >
                      <ExternalLink className="mr-1 h-3 w-3" />
                      {isKo ? "상세 페이지" : "Detail page"}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border bg-white shadow-sm">
            <div className="min-w-[720px]">
              {rows.map((row, i) => (
                <div
                  key={row.label}
                  className={`grid items-start ${i % 2 === 0 ? "bg-slate-50/50" : "bg-white"}`}
                  style={{
                    gridTemplateColumns: `180px repeat(${items.length}, minmax(0,1fr))`,
                  }}
                >
                  <div className="px-5 py-4 text-sm font-semibold text-navy/70">
                    {row.label}
                  </div>
                  {items.map((media) => (
                    <div key={media.id} className="px-5 py-4 text-center">
                      {row.render(media)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 text-center">
            <SolutionCtaButton
              label={
                isKo
                  ? "이 매체로 캠페인 제안 받기"
                  : "Get Campaign Proposal for These Media"
              }
              size="lg"
              className="h-12"
            />
          </div>
        </div>
      </section>
    </>
  );
}
