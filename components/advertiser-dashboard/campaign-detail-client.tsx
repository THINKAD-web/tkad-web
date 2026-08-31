"use client";

import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, BarChart3, Download, FileText, MapPin } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import { DarkCampaignMap } from "@/components/public-map/dark-campaign-map";
import type { CampaignMapPin } from "@/lib/campaign-monitoring-mock";
import { AdvertiserImpressionsChart } from "@/components/advertiser-dashboard/impressions-chart";
import {
  CampaignProofSection,
  type ProofPhotoItem,
} from "@/components/advertiser-dashboard/campaign-proof-section";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type CampaignDetailBooking = {
  id: string;
  mediaId?: string;
  title: string;
  mediaName: string;
  location: string;
  startsAt: string;
  endsAt: string;
  status: string;
};

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
  /** True only when reportGeneratedAt is set (honest). */
  reportReady: boolean;
  reportGeneratedAt: string | null;
  mediaBookings: CampaignDetailBooking[];
};

const BOOKING_STATUS_LABEL: Record<string, { ko: string; en: string }> = {
  requested: { ko: "신청", en: "Requested" },
  tentative: { ko: "가홀드", en: "Tentative" },
  confirmed: { ko: "확정", en: "Confirmed" },
  cancelled: { ko: "취소", en: "Cancelled" },
  expired: { ko: "만료", en: "Expired" },
};

function bookingStatusTone(status: string): string {
  switch (status) {
    case "confirmed":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "tentative":
      return "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200";
    case "requested":
      return "border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-200";
    case "cancelled":
    case "expired":
      return "border-border bg-muted/50 text-muted-foreground";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

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
  const reportReady = Boolean(initial.reportGeneratedAt);
  const bookings = initial.mediaBookings ?? [];

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
        className="mb-4 inline-flex items-center gap-2 tkad-type-label text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {isKo ? "대시보드" : "Dashboard"}
      </Link>

      <h1 className="text-xl font-black tracking-tight sm:text-2xl">
        {initial.name}
      </h1>
      <p className="mt-1 tkad-type-label text-muted-foreground">
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
        <h2 className="mb-3 font-display tkad-type-caption font-black uppercase tracking-[0.24em]">
          {isKo ? "매체 예약 상태" : "Media booking status"}
        </h2>
        {bookings.length > 0 ? (
          <div className="overflow-hidden rounded-[20px] border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 font-display tkad-type-note font-bold uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 font-bold">
                    {isKo ? "매체" : "Media"}
                  </th>
                  <th className="hidden px-3 py-2.5 font-bold sm:table-cell">
                    {isKo ? "기간" : "Period"}
                  </th>
                  <th className="px-3 py-2.5 font-bold">
                    {isKo ? "상태" : "Status"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const label =
                    BOOKING_STATUS_LABEL[b.status]?.[isKo ? "ko" : "en"] ??
                    b.status;
                  return (
                    <tr
                      key={b.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-3 py-3 align-top">
                        <p className="font-semibold leading-snug text-foreground">
                          {b.mediaName}
                        </p>
                        {b.location ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {b.location}
                          </p>
                        ) : null}
                        <p className="mt-1 tkad-type-caption text-muted-foreground sm:hidden">
                          {b.startsAt} ~ {b.endsAt}
                        </p>
                      </td>
                      <td className="hidden px-3 py-3 align-top text-xs text-muted-foreground sm:table-cell">
                        {b.startsAt} ~ {b.endsAt}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold",
                            bookingStatusTone(b.status),
                          )}
                        >
                          {label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-[16px] border border-dashed border-border p-4 text-sm text-muted-foreground">
            {isKo
              ? "배정된 매체 예약이 없습니다."
              : "No media bookings assigned yet."}
          </p>
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-3 font-display tkad-type-caption font-black uppercase tracking-[0.24em]">
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
        <h2 className="mb-3 font-display tkad-type-caption font-black uppercase tracking-[0.24em]">
          {isKo ? "일별 노출 추이" : "Daily impressions"}
        </h2>
        <AdvertiserImpressionsChart data={initial.dailySeries} isKo={isKo} />
        <p className="mt-2 text-center tkad-type-note text-muted-foreground">
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

      <section className="mt-8">
        <h2 className="mb-3 font-display tkad-type-caption font-black uppercase tracking-[0.24em]">
          {isKo ? "결과 리포트" : "Completion report"}
        </h2>
        {reportReady ? (
          <div className="space-y-3 rounded-[20px] border border-emerald-500/35 bg-emerald-500/10 p-4">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">
                  {isKo ? "리포트 준비됨" : "Report ready"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isKo
                    ? `생성일 ${initial.reportGeneratedAt?.slice(0, 10) ?? "—"}`
                    : `Generated ${initial.reportGeneratedAt?.slice(0, 10) ?? "—"}`}
                </p>
              </div>
            </div>
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
        ) : (
          <div className="flex items-start gap-3 rounded-[20px] border border-dashed border-border p-4">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-bold text-foreground">
                {isKo ? "작성 예정" : "Report pending"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isKo
                  ? "캠페인 종료 후 결과 리포트가 준비되면 여기에서 받을 수 있습니다."
                  : "The completion report will appear here after it is generated."}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
