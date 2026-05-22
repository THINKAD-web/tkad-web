"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  BarChart3,
  Eye,
  ExternalLink,
  Hash,
  LineChart,
  MapPin,
  MousePointerClick,
  Radio,
  RefreshCw,
} from "lucide-react";
import {
  CLIENT_SESSION_EMAIL_KEY,
  findClientByEmail,
  getDefaultDemoClient,
  type Client,
} from "@/lib/client-portal-mock";
import {
  getInProgressProjects,
  getMonitoringPinsForClient,
  sumPinImpressionsToday,
  sumPinImpressionsTotal,
  type CampaignMapPin,
} from "@/lib/campaign-monitoring-mock";
import {
  CampaignMonitoringMap,
  campaignMapProviderLabel,
  getCampaignMonitoringMapProvider,
  mediaLabel,
} from "@/components/campaign-monitoring-map";
import { cn } from "@/lib/utils";

function formatImp(n: number, isKo: boolean) {
  return n.toLocaleString(isKo ? "ko-KR" : "en-US");
}

function formatTime(iso: string, isKo: boolean) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(isKo ? "ko-KR" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function ClientMonitoringPage() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const [client, setClient] = useState<Client | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [liveImp, setLiveImp] = useState<Record<string, number>>({});
  const [baselineImp, setBaselineImp] = useState<Record<string, number>>({});
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  useEffect(() => {
    startTransition(() => {
      const raw = localStorage.getItem(CLIENT_SESSION_EMAIL_KEY);
      const resolved = raw
        ? (findClientByEmail(raw) ?? getDefaultDemoClient())
        : getDefaultDemoClient();
      const next: Record<string, number> = {};
      for (const p of resolved.projects) {
        if (p.status === "in_progress" && p.metrics) {
          next[p.id] = p.metrics.impressions;
        }
      }
      setBaselineImp(next);
      setClient(resolved);
      setLiveImp(next);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!client) return;
    const ids = client.projects
      .filter((p) => p.status === "in_progress" && p.metrics)
      .map((p) => p.id);
    if (ids.length === 0) return;
    const t = setInterval(() => {
      setLiveImp((prev) => {
        const copy = { ...prev };
        for (const id of ids) {
          const bump = Math.floor(Math.random() * 800) + 120;
          copy[id] = (copy[id] ?? 0) + bump;
        }
        return copy;
      });
    }, 4000);
    return () => clearInterval(t);
  }, [client]);

  const basePins = useMemo(
    () => (client ? getMonitoringPinsForClient(client) : []),
    [client],
  );

  const scaleForProject = useCallback(
    (projectId: string) => {
      const base = baselineImp[projectId] ?? 1;
      const live = liveImp[projectId] ?? base;
      return base > 0 ? live / base : 1;
    },
    [baselineImp, liveImp],
  );

  const pins = useMemo(() => {
    return basePins.map((p) => {
      const r = scaleForProject(p.projectId);
      return {
        ...p,
        impressionsToday: Math.max(0, Math.round(p.impressionsToday * r)),
        impressionsTotal: Math.max(0, Math.round(p.impressionsTotal * r)),
      };
    });
  }, [basePins, scaleForProject]);

  const inProgress = useMemo(
    () => (client ? getInProgressProjects(client) : []),
    [client],
  );

  const selectedPin = useMemo(
    () => pins.find((p) => p.id === selectedPinId) ?? null,
    [pins, selectedPinId],
  );

  const summary = useMemo(() => {
    const pinToday = sumPinImpressionsToday(pins);
    const liveTotals = inProgress.reduce(
      (a, p) => a + (liveImp[p.id] ?? p.metrics?.impressions ?? 0),
      0,
    );
    const ctrAvg =
      inProgress.length > 0
        ? inProgress.reduce((a, p) => a + (p.metrics?.ctrPercent ?? 0), 0) /
          inProgress.length
        : 0;
    const pinCumulative = sumPinImpressionsTotal(pins);
    return {
      pinToday,
      liveTotals,
      ctrAvg,
      spots: pins.length,
      pinCumulative,
      inFlightCount: inProgress.length,
    };
  }, [inProgress, liveImp, pins]);

  const onSelectPin = useCallback((id: string | null) => {
    setSelectedPinId(id);
  }, []);

  if (!hydrated || !client) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <header className="border-b border-navy/10 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/client/dashboard"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-navy hover:text-gold-dark"
            >
              <ArrowLeft className="h-4 w-4" />
              {isKo ? "대시보드" : "Dashboard"}
            </Link>
            <span className="hidden h-4 w-px bg-slate-200 sm:block" />
            <div>
              <h1 className="text-lg font-extrabold text-navy sm:text-xl">
                {isKo ? "실시간 캠페인 모니터링" : "Live campaign monitoring"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {client.company} · {campaignMapProviderLabel(isKo)}
                {getCampaignMonitoringMapProvider() === "kakao"
                  ? isKo
                    ? " · 카카오맵 JavaScript"
                    : " · Kakao Maps JavaScript"
                  : null}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <div className="space-y-2">
          <h2 className="text-lg font-extrabold text-navy sm:text-xl">
            {isKo ? "전체 성과 요약" : "Performance overview"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isKo
              ? `진행 중 캠페인 ${summary.inFlightCount}건 · 지도 핀 ${summary.spots}개 기준 집계입니다.`
              : `${summary.inFlightCount} in-flight campaign(s), ${summary.spots} placement pin(s).`}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Card className="border-navy/10 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-navy/80">
                {isKo ? "오늘 추정 노출 (매체 합)" : "Est. today impressions"}
              </CardTitle>
              <Eye className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-navy">
                {formatImp(summary.pinToday, isKo)}
              </p>
              <p className="text-xs text-muted-foreground">
                {isKo ? "지도 핀 기준 합산" : "Sum of map placements"}
              </p>
            </CardContent>
          </Card>
          <Card className="border-navy/10 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-navy/80">
                {isKo ? "누적 노출 (캠페인)" : "Campaign impressions"}
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-navy">
                {formatImp(summary.liveTotals, isKo)}
              </p>
              <p className="text-xs text-muted-foreground">
                {isKo ? "진행 중 프로젝트 실시간 합" : "Live total (in-flight)"}
              </p>
            </CardContent>
          </Card>
          <Card className="border-navy/10 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-navy/80">
                {isKo ? "평균 CTR" : "Avg. CTR"}
              </CardTitle>
              <MousePointerClick className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-navy">
                {summary.ctrAvg > 0 ? `${summary.ctrAvg.toFixed(2)}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isKo ? "진행 중 캠페인 기준" : "In-flight campaigns"}
              </p>
            </CardContent>
          </Card>
          <Card className="border-navy/10 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-navy/80">
                {isKo ? "집행 거점" : "Active placements"}
              </CardTitle>
              <MapPin className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-navy">{summary.spots}</p>
              <p className="text-xs text-muted-foreground">
                {isKo ? "지도 핀 수" : "Pins on map"}
              </p>
            </CardContent>
          </Card>
          <Card className="border-navy/10 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-navy/80">
                {isKo ? "매체 누적 노출 합" : "Cumulative media impressions"}
              </CardTitle>
              <Hash className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-navy">
                {formatImp(summary.pinCumulative, isKo)}
              </p>
              <p className="text-xs text-muted-foreground">
                {isKo ? "지도 핀 기준 누적 합산" : "Sum of pin lifetime totals"}
              </p>
            </CardContent>
          </Card>
        </div>

        {inProgress.length > 0 ? (
          <Card className="border-navy/10 shadow-sm">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-navy">
                    {isKo ? "진행 중 캠페인" : "In-flight campaigns"}
                  </CardTitle>
                  <CardDescription>
                    {isKo
                      ? "실시간 노출은 데모 시뮬레이션입니다."
                      : "Live numbers are simulated for this demo."}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <RefreshCw className="h-3.5 w-3.5" />
                  {isKo ? "4초 간격 갱신" : "Updates every 4s"}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {inProgress.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-navy">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.id}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="inline-flex items-center gap-1 font-medium text-navy">
                      <LineChart className="h-3.5 w-3.5 text-gold" />
                      {formatImp(liveImp[p.id] ?? p.metrics?.impressions ?? 0, isKo)}
                    </span>
                    {p.metrics ? (
                      <span className="text-xs text-muted-foreground">
                        CTR {p.metrics.ctrPercent}%
                        {isKo ? ` · ${p.metrics.ctrTrendKo}` : ` · ${p.metrics.ctrTrendEn}`}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-3 lg:col-span-3">
            <CampaignMonitoringMap
              pins={pins}
              selectedId={selectedPinId}
              onSelectPin={onSelectPin}
              isKo={isKo}
            />
            {pins.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {isKo
                  ? "목록에서 핀을 선택하거나 지도(또는 데모 격자)의 마커를 눌러 상세를 확인하세요."
                  : "Select a pin below or tap a map marker to view details."}
              </p>
            ) : null}
            {pins.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {pins.map((p) => (
                  <Button
                    key={p.id}
                    type="button"
                    size="sm"
                    variant={selectedPinId === p.id ? "default" : "outline"}
                    className={cn(
                      "rounded-full text-xs",
                      selectedPinId === p.id ? "bg-navy dark:text-white text-gray-900" : "border-navy/20",
                    )}
                    onClick={() =>
                      setSelectedPinId((cur) => (cur === p.id ? null : p.id))
                    }
                  >
                    <MapPin className="mr-1 h-3.5 w-3.5" />
                    {isKo ? p.spotNameKo : p.spotNameEn}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-2">
            {selectedPin ? (
              <PinDetailCard pin={selectedPin} isKo={isKo} />
            ) : (
              <Card className="h-full min-h-[280px] border-dashed border-navy/20 bg-slate-50/50">
                <CardContent className="flex h-full min-h-[inherit] flex-col items-center justify-center gap-2 p-6 text-center">
                  <Radio className="h-10 w-10 text-gold/40" />
                  <p className="text-sm font-medium text-navy">
                    {isKo ? "핀을 선택하세요" : "Select a placement"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isKo
                      ? "매체 유형, 크리에이티브, 노출 지표를 확인할 수 있습니다."
                      : "View media type, creative, and exposure metrics."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PinDetailCard({ pin, isKo }: { pin: CampaignMapPin; isKo: boolean }) {
  return (
    <Card className="overflow-hidden border-navy/10 shadow-md">
      <div className="relative aspect-video w-full bg-slate-200">
        {/* eslint-disable-next-line @next/next/no-img-element -- remote demo creative */}
        <img
          src={pin.imageUrl}
          alt={isKo ? pin.creativeCaptionKo : pin.creativeCaptionEn}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-gold/15 text-navy">
            {mediaLabel(pin.mediaType, isKo)}
          </Badge>
          <Badge variant="outline" className="border-navy/20 text-xs text-navy/70">
            {pin.projectId}
          </Badge>
        </div>
        <CardTitle className="text-base text-navy">
          {isKo ? pin.spotNameKo : pin.spotNameEn}
        </CardTitle>
        <CardDescription className="text-sm">
          {isKo ? pin.creativeCaptionKo : pin.creativeCaptionEn}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs text-navy/70">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-gold-dark" />
          <span className="font-mono">
            {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
          </span>
        </div>
        <a
          href={`https://map.kakao.com/link/map/${encodeURIComponent(isKo ? pin.spotNameKo : pin.spotNameEn)},${pin.lat},${pin.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold-dark underline-offset-4 hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {isKo ? "카카오맵에서 위치 보기" : "Open in Kakao Map"}
        </a>
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {isKo ? "금일 추정 노출" : "Est. today"}
            </p>
            <p className="text-lg font-bold text-navy">
              {formatImp(pin.impressionsToday, isKo)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {isKo ? "누적 노출" : "Total impressions"}
            </p>
            <p className="text-lg font-bold text-navy">
              {formatImp(pin.impressionsTotal, isKo)}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {isKo ? "데이터 갱신" : "Last updated"}:{" "}
          {formatTime(pin.lastUpdatedIso, isKo)}
        </p>
      </CardContent>
    </Card>
  );
}
