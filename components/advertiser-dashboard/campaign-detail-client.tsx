"use client";

import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, BarChart3, Download, MapPin } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import { DarkCampaignMap } from "@/components/public-map/dark-campaign-map";
import type { CampaignMapPin } from "@/lib/campaign-monitoring-mock";
import { AdvertiserImpressionsChart } from "@/components/advertiser-dashboard/impressions-chart";
import {
  CampaignProofSection,
  type ProofPhotoItem,
} from "@/components/advertiser-dashboard/campaign-proof-section";
import { useState } from "react";

export type CampaignDetailData = {
  id: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  impressionsTotal: number;
  dailySeries: { date: string; impressions: number }[];
  latestProofAt: string | null;
  proofPhotos: ProofPhotoItem[];
  mapPins: CampaignMapPin[];
  reportReady: boolean;
};

export function AdvertiserCampaignDetailClient({
  initial,
  initialTab,
}: {
  initial: CampaignDetailData;
  initialTab?: "proof";
}) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const [downloading, setDownloading] = useState(false);

  const downloadReport = async () => {
    setDownloading(true);
    try {
      const res = await fetch(
        `/api/my/dashboard/campaigns/${encodeURIComponent(initial.id)}/report`,
      );
      if (!res.ok) throw new Error("download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${initial.name}_report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 pb-24 sm:py-8">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-2 font-display text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {isKo ? "대시보드" : "Dashboard"}
      </Link>

      <h1 className="text-xl font-black tracking-tight sm:text-2xl">
        {initial.name}
      </h1>
      <p className="mt-1 font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {initial.startDate ?? "—"} ~ {initial.endDate ?? "—"} · {initial.status}
      </p>

      <div className="mt-5">
        <Link
          href={`/dashboard/campaigns/${initial.id}/analytics`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] border border-hermes/30 bg-hermes/10 px-4 py-3 text-sm font-bold text-hermes transition-colors hover:bg-hermes/20"
        >
          <BarChart3 className="h-4 w-4" />
          {isKo ? "성과 분석 보기" : "View performance analytics"}
        </Link>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 font-display text-[11px] font-black uppercase tracking-[0.24em]">
          {isKo ? "집행 매체 지도" : "Media map"}
        </h2>
        {initial.mapPins.length > 0 ? (
          <div className="overflow-hidden rounded-[20px] border border-border">
            <DarkCampaignMap
              pins={initial.mapPins}
              selectedId={initial.mapPins[0]?.id}
              onSelectPin={() => {}}
              isKo={isKo}
              className="h-56 sm:h-72"
              showFooterCaption={false}
            />
          </div>
        ) : (
          <p className="flex items-center gap-2 rounded-[16px] border border-dashed border-border p-4 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {isKo ? "좌표가 등록된 매체가 없습니다." : "No geolocated media yet."}
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-[11px] font-black uppercase tracking-[0.24em]">
          {isKo ? "일별 노출 추이" : "Daily impressions"}
        </h2>
        <AdvertiserImpressionsChart data={initial.dailySeries} isKo={isKo} />
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          {isKo
            ? `누적 추정 노출 ${initial.impressionsTotal.toLocaleString("ko-KR")}`
            : `Total est. impressions ${initial.impressionsTotal.toLocaleString("en-US")}`}
        </p>
      </section>

      <CampaignProofSection
        campaignId={initial.id}
        initialPhotos={initial.proofPhotos}
        initialLatestAt={initial.latestProofAt}
        isKo={isKo}
        scrollOnMount={initialTab === "proof"}
      />

      {initial.reportReady ? (
        <div className="mt-8">
          <BtnBlock
            variant="accent"
            size="lg"
            className="w-full"
            disabled={downloading}
            onClick={() => void downloadReport()}
          >
            <Download className="h-4 w-4" />
            {downloading
              ? isKo
                ? "다운로드 중…"
                : "Downloading…"
              : isKo
                ? "리포트 PDF 다운로드"
                : "Download report PDF"}
          </BtnBlock>
        </div>
      ) : null}
    </div>
  );
}
