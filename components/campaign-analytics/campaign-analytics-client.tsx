"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useCallback } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  ArrowLeft,
  BarChart3,
  Download,
  MapPin,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BtnBlock } from "@/components/brutalist";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import MediaLightbox from "@/components/media-lightbox";
import type { CampaignAnalyticsData } from "@/lib/campaign-analytics";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import {
  computeMetricVariance,
  formatActualSource,
} from "@/lib/campaign-actuals";
import { formatVariancePct } from "@/lib/prediction-accuracy";

const PIE_COLORS = ["#a855f7", "#22d3ee", "#ec4899", "#7c3aed", "#0ea5e9", "#f43f5e"];

type Props = {
  data: CampaignAnalyticsData;
  /** advertiser | admin */
  mode: "advertiser" | "admin";
  backHref: string;
  reportPdfHref: string;
};

function fmt(n: number, isKo: boolean) {
  return n.toLocaleString(isKo ? "ko-KR" : "en-US");
}

export function CampaignAnalyticsClient({
  data,
  mode,
  backHref,
  reportPdfHref,
}: Props) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const proofUrls = useMemo(
    () => data.proofPhotos.map((p) => p.imageUrl).filter(Boolean),
    [data.proofPhotos],
  );

  const pieData = useMemo(
    () =>
      data.mediaShares.map((m) => ({
        name: m.name,
        value: m.impressions,
        mediaId: m.mediaId,
        pct: m.sharePct,
      })),
    [data.mediaShares],
  );

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await fetch(reportPdfHref, { credentials: "include" });
      if (!res.ok) throw new Error("download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.name}_report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const onPieClick = useCallback(
    (entry: { mediaId?: string } | null) => {
      const id = entry?.mediaId;
      if (id) router.push(mediaItemDetailPath(id));
    },
    [router],
  );

  const kpiCards = [
    {
      label: isKo ? "총 추정 노출수" : "Total impressions (est.)",
      value: fmt(data.kpis.totalImpressions, isKo),
      accent: "from-[#a855f7]/20 to-transparent",
    },
    {
      label: isKo ? "예상 순 도달 (Reach)" : "Est. reach",
      value: fmt(data.kpis.reach, isKo),
      accent: "from-[#22d3ee]/20 to-transparent",
    },
    {
      label: isKo ? "평균 빈도 (Frequency)" : "Avg. frequency",
      value: data.kpis.frequency.toFixed(1),
      accent: "from-[#ec4899]/20 to-transparent",
    },
    {
      label: "CPM",
      value:
        data.kpis.cpm != null
          ? `₩${fmt(data.kpis.cpm, isKo)}`
          : isKo
            ? "—"
            : "—",
      accent: "from-[#7c3aed]/20 to-transparent",
    },
  ];

  return (
    <HomeLandingDayNight>
      <AnalyticsShell>
        <Link
          href={backHref}
          className="mb-4 inline-flex items-center gap-2 font-display text-xs font-medium uppercase tracking-[0.2em] dark:text-white text-gray-500 hover:dark:text-white text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {mode === "admin"
            ? isKo
              ? "캠페인 관리"
              : "Campaign admin"
            : isKo
              ? "캠페인 상세"
              : "Campaign detail"}
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-[#22d3ee]">
              [ {isKo ? "성과 분석" : "PERFORMANCE ANALYTICS"} ]
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight dark:text-white text-gray-900 sm:text-3xl">
              {data.name}
            </h1>
            <p className="mt-2 text-[11px] tracking-tight dark:text-white text-gray-500">
              {data.startDate ?? "—"} ~ {data.endDate ?? "—"} · {data.status}
              {data.clientCompany ? ` · ${data.clientCompany}` : ""}
            </p>
          </div>
          <BarChart3 className="hidden h-10 w-10 text-[#a855f7] sm:block" aria-hidden />
        </div>

        <p className="mt-4 text-[10px] tracking-tight dark:text-white">
          {`// `}
          {isKo
            ? "집행 기간·매체 DB 기반 추정치입니다. 공식 집행 리포트는 PDF를 참고하세요."
            : "Estimates from flight dates and media catalog. See PDF for official report."}
        </p>

        <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((card) => (
            <div
              key={card.label}
              className={`rounded-[20px] border dark:border-white/12 border-gray-200 bg-gradient-to-br ${card.accent} dark:bg-black bg-white/40 dark:bg-white/8 bg-gray-100 p-4 backdrop-blur`}
            >
              <p className="font-display text-xs font-medium uppercase tracking-[0.18em] dark:text-white text-gray-500">
                {card.label}
              </p>
              <p className="mt-2 text-2xl font-black tabular-nums tracking-tight dark:text-white text-gray-900">
                {card.value}
              </p>
            </div>
          ))}
        </section>

        <PredictedVsActual data={data} mode={mode} isKo={isKo} />

        <section className="mt-8 rounded-[24px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white/40 dark:bg-white/8 bg-gray-100 p-4 backdrop-blur sm:p-6">
          <h2 className="font-display text-[11px] font-black uppercase tracking-[0.24em] dark:text-white text-gray-600">
            {isKo ? "노출 추이" : "Impression trend"}
          </h2>
          <p className="mt-1 text-[10px] dark:text-white">
            {isKo
              ? "평일(시안) · 주말(핑크) 구분"
              : "Weekday (cyan) · weekend (pink)"}
          </p>
          <div className="mt-4 h-64 w-full sm:h-72">
            {data.dailySeries.length < 2 ? (
              <p className="flex h-full items-center justify-center text-sm dark:text-white text-gray-400">
                {isKo
                  ? "집행 기간이 확정되면 차트가 표시됩니다."
                  : "Chart appears once the flight period is set."}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.dailySeries.map((d) => ({
                    ...d,
                    label: d.date.slice(5),
                  }))}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "rgba(255,255,255,0.45)" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "rgba(255,255,255,0.45)" }}
                    tickFormatter={(v) =>
                      Number(v).toLocaleString(isKo ? "ko-KR" : "en-US", {
                        notation: "compact",
                      })
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0a0a0f",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 12,
                      fontSize: 11,
                    }}
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload as { date?: string } | undefined;
                      return row?.date ?? "";
                    }}
                    formatter={(value: number, name: string) => [
                      fmt(value, isKo),
                      name === "weekendImp"
                        ? isKo
                          ? "주말"
                          : "Weekend"
                        : isKo
                          ? "평일"
                          : "Weekday",
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 10, color: "rgba(255,255,255,0.55)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="weekdayImp"
                    name={isKo ? "평일" : "Weekday"}
                    stroke="#22d3ee"
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="weekendImp"
                    name={isKo ? "주말" : "Weekend"}
                    stroke="#ec4899"
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-[24px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white/40 dark:bg-white/8 bg-gray-100 p-4 backdrop-blur sm:p-6">
            <h2 className="font-display text-[11px] font-black uppercase tracking-[0.24em] dark:text-white text-gray-600">
              {isKo ? "매체별 기여도" : "Media contribution"}
            </h2>
            <p className="mt-1 text-[10px] dark:text-white">
              {isKo ? "조각 클릭 시 매체 상세로 이동" : "Click a slice for media detail"}
            </p>
            {pieData.length === 0 ? (
              <p className="mt-6 text-sm dark:text-white text-gray-400">
                {isKo ? "연결된 매체가 없습니다." : "No linked media."}
              </p>
            ) : (
              <div className="mt-4 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={88}
                      paddingAngle={2}
                      stroke="#0a0a0f"
                      strokeWidth={2}
                      onClick={(d) =>
                        onPieClick(d as { mediaId?: string } | null)
                      }
                      className="cursor-pointer"
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={entry.mediaId}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#0a0a0f",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 12,
                        fontSize: 11,
                      }}
                      formatter={(value: number, _name: string, item) => {
                        const pct = (item?.payload as { pct?: number })?.pct;
                        return [
                          `${fmt(value, isKo)}${pct != null ? ` (${pct}%)` : ""}`,
                          isKo ? "노출" : "Impressions",
                        ];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <ul className="mt-4 space-y-2">
              {data.mediaShares.slice(0, 6).map((m, i) => (
                <li key={m.mediaId}>
                  <Link
                    href={mediaItemDetailPath(m.mediaId)}
                    className="flex items-center justify-between gap-2 rounded-[14px] border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50 px-3 py-2 text-sm transition-colors hover:dark:border-white/20 border-gray-300 hover:dark:bg-white/10 bg-gray-100"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          background: PIE_COLORS[i % PIE_COLORS.length],
                        }}
                      />
                      <span className="truncate font-medium dark:text-white text-gray-900">
                        {m.name}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] dark:text-white text-gray-500">
                      {m.sharePct}%
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[24px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white/40 dark:bg-white/8 bg-gray-100 p-4 backdrop-blur sm:p-6">
            <h2 className="font-display text-[11px] font-black uppercase tracking-[0.24em] dark:text-white text-gray-600">
              {isKo ? "지역별 커버리지" : "Regional coverage"}
            </h2>
            <p className="mt-1 text-[10px] dark:text-white">
              {isKo ? "집행 지역별 추정 노출 비중" : "Share of est. impressions by region"}
            </p>
            {data.regionShares.length === 0 ? (
              <p className="mt-6 flex items-center gap-2 text-sm dark:text-white text-gray-400">
                <MapPin className="h-4 w-4" />
                {isKo ? "지역 데이터가 없습니다." : "No region data."}
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {data.regionShares.map((r) => (
                  <li
                    key={r.region}
                    className="rounded-[14px] border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50 px-3 py-3"
                  >
                    <RegionShareRow row={r} isKo={isKo} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="mt-8 rounded-[24px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white/40 dark:bg-white/8 bg-gray-100 p-4 backdrop-blur sm:p-6">
          <h2 className="font-display text-[11px] font-black uppercase tracking-[0.24em] dark:text-white text-gray-600">
            {isKo ? "집행 인증 사진" : "Proof photos"}
          </h2>
          {data.proofPhotos.length === 0 ? (
            <p className="mt-4 text-sm dark:text-white text-gray-400">
              {isKo
                ? "업로드된 인증 사진이 없습니다."
                : "No proof photos uploaded yet."}
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {data.proofPhotos.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setLightboxIndex(idx);
                    setLightboxOpen(true);
                  }}
                  className="group relative aspect-[4/3] overflow-hidden rounded-[14px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white dark:bg-white/5 bg-gray-500 text-left"
                >
                  <Image
                    src={p.imageUrl}
                    alt={p.caption ?? ""}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="(max-width:640px) 50vw, 25vw"
                    unoptimized
                  />
                  {p.caption ? (
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 text-[10px] dark:text-white text-gray-900">
                      {p.caption}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10 space-y-3 pb-8">
          <p className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-500">
            [ {isKo ? "다음 액션" : "NEXT ACTIONS"} ]
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <BtnBlock
              type="button"
              variant="accent"
              size="lg"
              disabled={downloading}
              onClick={() => void downloadPdf()}
              className="inline-flex flex-1 min-w-[200px] items-center justify-center gap-2 rounded-[22px] border dark:border-white/14 border-gray-200 bg-[linear-gradient(135deg,rgba(168,85,247,0.95),rgba(34,211,238,0.95))] dark:text-white text-gray-900"
            >
              <Download className="h-4 w-4" />
              {downloading
                ? isKo
                  ? "저장 중…"
                  : "Saving…"
                : isKo
                  ? "리포트 PDF 저장"
                  : "Save report PDF"}
            </BtnBlock>
            <Link
              href={`/contact?rerun=${encodeURIComponent(data.id)}`}
              className="inline-flex flex-1 min-w-[200px] items-center justify-center gap-2 rounded-[22px] border dark:border-white/14 border-gray-200 dark:bg-white/8 bg-gray-100 px-6 py-3 text-center font-bold dark:text-white text-gray-900 backdrop-blur transition-colors hover:bg-white/12"
            >
              <RefreshCw className="h-4 w-4" />
              {isKo ? "이 캠페인 다시 집행하기" : "Re-run this campaign"}
            </Link>
            <Link
              href={`/recommend?similar=${encodeURIComponent(data.id)}`}
              className="inline-flex flex-1 min-w-[200px] items-center justify-center gap-2 rounded-[22px] border border-[#22d3ee]/30 bg-[#22d3ee]/10 px-6 py-3 text-center font-bold text-[#22d3ee] transition-colors hover:bg-[#22d3ee]/20"
            >
              <Sparkles className="h-4 w-4" />
              {isKo ? "유사 매체 추천받기" : "Similar media picks"}
            </Link>
          </div>
        </section>

        <MediaLightbox
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          images={proofUrls}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          altBase={data.name}
          labels={{
            close: isKo ? "닫기" : "Close",
            prev: isKo ? "이전" : "Prev",
            next: isKo ? "다음" : "Next",
            expand: isKo ? "확대" : "Expand",
          }}
        />
      </AnalyticsShell>
    </HomeLandingDayNight>
  );
}

function VarianceBadge({
  variancePct,
  isKo,
}: {
  variancePct: number | null;
  isKo: boolean;
}) {
  if (variancePct == null) {
    return <span className="text-sm dark:text-white/50 text-gray-400">—</span>;
  }
  const positive = variancePct >= 0;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
        positive
          ? "bg-emerald-500/15 text-emerald-500"
          : "bg-rose-500/15 text-rose-500"
      }`}
    >
      {formatVariancePct(variancePct, isKo ? "ko" : "en")}
    </span>
  );
}

function PredictedVsActual({
  data,
  mode,
  isKo,
}: {
  data: CampaignAnalyticsData;
  mode: "advertiser" | "admin";
  isKo: boolean;
}) {
  const router = useRouter();
  const actual = data.actual;
  const canEdit = mode === "admin";

  const [impInput, setImpInput] = useState(
    actual?.impressions != null ? String(actual.impressions) : "",
  );
  const [reachInput, setReachInput] = useState(
    actual?.reach != null ? String(actual.reach) : "",
  );
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // 광고주 모드에서 실측이 없으면 섹션 자체를 숨긴다.
  if (!canEdit && !actual) return null;

  const impVar = computeMetricVariance(
    data.kpis.totalImpressions,
    actual?.impressions,
  );
  const reachVar = computeMetricVariance(data.kpis.reach, actual?.reach);

  const save = async () => {
    setSaving(true);
    setSavedMsg(null);
    try {
      const res = await fetch(`/api/admin/campaigns/${data.id}/actuals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          actualImpressions: impInput.trim() === "" ? null : impInput.trim(),
          actualReach: reachInput.trim() === "" ? null : reachInput.trim(),
        }),
      });
      const json = (await res.json()) as { ok?: boolean };
      if (!res.ok || !json.ok) throw new Error("save failed");
      setSavedMsg(isKo ? "저장됨 · 광고주에게 반영" : "Saved · visible to advertiser");
      router.refresh();
    } catch {
      setSavedMsg(isKo ? "저장 실패" : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const rows: { label: string; v: ReturnType<typeof computeMetricVariance> }[] = [
    { label: isKo ? "노출수" : "Impressions", v: impVar },
    { label: isKo ? "도달수 (Reach)" : "Reach", v: reachVar },
  ];

  return (
    <section className="mt-8 rounded-[24px] border border-[#a855f7]/30 dark:bg-black bg-white/40 dark:bg-white/8 bg-gray-100 p-4 backdrop-blur sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-[11px] font-black uppercase tracking-[0.24em] dark:text-white text-gray-600">
          {isKo ? "예측 vs 실제" : "Predicted vs Actual"}
        </h2>
        {actual?.enteredAt ? (
          <span className="text-[10px] dark:text-white/55 text-gray-500">
            {formatActualSource(actual.source, isKo)} ·{" "}
            {actual.enteredAt.slice(0, 10)}
          </span>
        ) : null}
      </div>

      {actual ? (
        <div className="mt-4 overflow-hidden rounded-[16px] border dark:border-white/10 border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="dark:bg-white/5 bg-gray-50 text-left text-[11px] uppercase tracking-wide dark:text-white/55 text-gray-500">
                <th className="px-3 py-2 font-semibold">{isKo ? "지표" : "Metric"}</th>
                <th className="px-3 py-2 text-right font-semibold">{isKo ? "예측" : "Predicted"}</th>
                <th className="px-3 py-2 text-right font-semibold">{isKo ? "실제" : "Actual"}</th>
                <th className="px-3 py-2 text-right font-semibold">{isKo ? "변동률" : "Variance"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-t dark:border-white/8 border-gray-100">
                  <td className="px-3 py-2.5 font-medium dark:text-white text-gray-900">{r.label}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums dark:text-white/70 text-gray-600">
                    {fmt(r.v.predicted, isKo)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold tabular-nums dark:text-white text-gray-900">
                    {r.v.actual != null ? fmt(r.v.actual, isKo) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <VarianceBadge variancePct={r.v.variancePct} isKo={isKo} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm dark:text-white/60 text-gray-500">
          {isKo
            ? "집행 종료 후 실측 노출·도달을 입력하면 예측 대비 정확도가 광고주에게 표시됩니다."
            : "Enter actual impressions/reach after the flight to show prediction accuracy to the advertiser."}
        </p>
      )}

      {canEdit ? (
        <div className="mt-5 rounded-[16px] border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50 p-4">
          <p className="font-display text-[11px] font-medium uppercase tracking-[0.18em] dark:text-white/70 text-gray-500">
            {isKo ? "실적 입력 (관리자)" : "Enter actuals (admin)"}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[11px] dark:text-white/60 text-gray-500">
                {isKo ? "실제 노출수" : "Actual impressions"}
              </span>
              <input
                type="number"
                min={0}
                value={impInput}
                onChange={(e) => setImpInput(e.target.value)}
                placeholder={fmt(data.kpis.totalImpressions, isKo)}
                className="mt-1 w-full rounded-lg border dark:border-white/12 border-gray-200 bg-transparent px-3 py-2 text-sm tabular-nums outline-none dark:text-white text-gray-900"
              />
            </label>
            <label className="block">
              <span className="text-[11px] dark:text-white/60 text-gray-500">
                {isKo ? "실제 도달수" : "Actual reach"}
              </span>
              <input
                type="number"
                min={0}
                value={reachInput}
                onChange={(e) => setReachInput(e.target.value)}
                placeholder={fmt(data.kpis.reach, isKo)}
                className="mt-1 w-full rounded-lg border dark:border-white/12 border-gray-200 bg-transparent px-3 py-2 text-sm tabular-nums outline-none dark:text-white text-gray-900"
              />
            </label>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#a855f7] px-4 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
              {isKo ? "저장" : "Save"}
            </button>
            {savedMsg ? (
              <span className="text-xs dark:text-emerald-400 text-emerald-600">{savedMsg}</span>
            ) : (
              <span className="text-[11px] dark:text-white/45 text-gray-400">
                {isKo ? "빈 칸 저장 시 실적 삭제" : "Empty = clear actuals"}
              </span>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function RegionShareRow({
  row,
  isKo,
}: {
  row: { region: string; impressions: number; sharePct: number };
  isKo: boolean;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold dark:text-white text-gray-900">{row.region}</span>
        <span className="text-[11px] text-[#22d3ee]">{row.sharePct}%</span>
      </div>
      <p className="mt-1 text-[10px] dark:text-white">
        {isKo ? "추정 노출" : "Est. imp."}{" "}
        {row.impressions.toLocaleString(isKo ? "ko-KR" : "en-US")}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full dark:bg-white/10 bg-gray-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#a855f7] via-[#22d3ee] to-[#ec4899]"
          style={{ width: `${Math.min(100, row.sharePct)}%` }}
        />
      </div>
    </>
  );
}

function AnalyticsShell({ children }: { children: ReactNode }) {
  return (
    <div className="tkad-landing-neon tkad-planner-neon min-h-[calc(100vh-72px)] bg-gray-50 px-4 dark:bg-[#0A0A0A] py-8 dark:text-white text-gray-900">
      <div className="mx-auto max-w-6xl">{children}</div>
    </div>
  );
}
