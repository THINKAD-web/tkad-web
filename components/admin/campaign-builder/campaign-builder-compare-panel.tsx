"use client";

import { useEffect, useMemo, useState } from "react";
import type { CampaignBuilderPayload } from "@/lib/admin-campaign-builder/schemas";
import type { CampaignBuilderReportListItem } from "@/lib/admin-campaign-builder/schemas";
import {
  diffChannelComposition,
  summarizeBuilderReport,
} from "@/lib/admin-campaign-builder/summary";
import type { PublicMediaView } from "@/lib/digital/public-media-types";
import { BudgetSplitDonut } from "@/components/planner/budget-split-donut";
import { PriceDisplay } from "@/components/admin/campaign-builder/price-display";

type Props = {
  isKo: boolean;
  reports: CampaignBuilderReportListItem[];
  digitalViews: PublicMediaView[];
};

export function CampaignBuilderComparePanel({
  isKo,
  reports,
  digitalViews,
}: Props) {
  const [idA, setIdA] = useState("");
  const [idB, setIdB] = useState("");
  const [payloadA, setPayloadA] = useState<CampaignBuilderPayload | null>(null);
  const [payloadB, setPayloadB] = useState<CampaignBuilderPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const catalogBySlug = useMemo(
    () => new Map(digitalViews.map((v) => [v.slug, v])),
    [digitalViews],
  );

  const digitalReports = useMemo(
    () =>
      reports.filter(
        (r) => r.mode === "digital" && r.title.trim().length > 0,
      ),
    [reports],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadReport(
      id: string,
      setter: (p: CampaignBuilderPayload | null) => void,
    ) {
      const res = await fetch(`/api/admin/campaign-builder/reports/${id}`, {
        credentials: "include",
      });
      const data = (await res.json()) as { payload?: CampaignBuilderPayload; error?: string };
      if (!res.ok || !data.payload) {
        throw new Error(data.error ?? "load failed");
      }
      if (!cancelled) setter(data.payload);
    }

    async function loadBoth() {
      setLoading(true);
      setError("");
      setPayloadA(null);
      setPayloadB(null);
      try {
        const tasks: Promise<void>[] = [];
        if (idA) tasks.push(loadReport(idA, setPayloadA));
        if (idB) tasks.push(loadReport(idB, setPayloadB));
        await Promise.all(tasks);
      } catch {
        if (!cancelled) {
          setError(
            isKo
              ? "선택한 리포트를 불러오지 못했습니다."
              : "Failed to load selected reports.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadBoth();
    return () => {
      cancelled = true;
    };
  }, [idA, idB, isKo]);

  const summaryA = useMemo(
    () =>
      payloadA ? summarizeBuilderReport(payloadA, catalogBySlug) : null,
    [payloadA, catalogBySlug],
  );

  const summaryB = useMemo(
    () =>
      payloadB ? summarizeBuilderReport(payloadB, catalogBySlug) : null,
    [payloadB, catalogBySlug],
  );

  const diffChart = useMemo(() => {
    if (!payloadA || !payloadB) return [];
    return diffChannelComposition(payloadA, payloadB, catalogBySlug);
  }, [payloadA, payloadB, catalogBySlug]);

  return (
    <section className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-4">
      <h2 className="font-bold">{isKo ? "시나리오 비교" : "Scenario compare"}</h2>
      <p className="text-sm text-muted-foreground">
        {isKo
          ? "저장된 디지털 리포트 2건을 선택하면 예산·성과 참고치·채널 구성을 나란히 비교합니다."
          : "Pick two saved digital reports to compare budget, KPIs, and channel mix."}
      </p>

      {digitalReports.length < 2 ? (
        <p className="text-sm text-muted-foreground">
          비교하려면 디지털 상품이 포함된 저장 리포트가 2건 이상 필요합니다.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              A
              <select
                value={idA}
                onChange={(e) => setIdA(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">{isKo ? "선택…" : "Select…"}</option>
                {digitalReports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              B
              <select
                value={idB}
                onChange={(e) => setIdB(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">{isKo ? "선택…" : "Select…"}</option>
                {digitalReports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">
              {isKo ? "불러오는 중…" : "Loading…"}
            </p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {summaryA && summaryB ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-2 rounded-lg border border-border/50 p-3">
                <p className="font-semibold">A</p>
                <p className="text-sm">
                  {isKo ? "총 예산" : "Total"}:{" "}
                  <PriceDisplay won={summaryA.totalBudgetWon} />
                </p>
                {summaryA.reachLabel ? (
                  <p className="text-sm text-muted-foreground">
                    {isKo ? "도달" : "Reach"}: {summaryA.reachLabel}
                  </p>
                ) : null}
                <BudgetSplitDonut data={summaryA.budgetChart} />
              </div>
              <div className="space-y-2 rounded-lg border border-border/50 p-3">
                <p className="font-semibold">B</p>
                <p className="text-sm">
                  {isKo ? "총 예산" : "Total"}:{" "}
                  <PriceDisplay won={summaryB.totalBudgetWon} />
                </p>
                {summaryB.reachLabel ? (
                  <p className="text-sm text-muted-foreground">
                    {isKo ? "도달" : "Reach"}: {summaryB.reachLabel}
                  </p>
                ) : null}
                <BudgetSplitDonut data={summaryB.budgetChart} />
                <p className="text-sm">
                  Δ {isKo ? "예산" : "Budget"}:{" "}
                  <PriceDisplay
                    won={summaryB.totalBudgetWon - summaryA.totalBudgetWon}
                  />
                </p>
              </div>
            </div>
          ) : null}

          {diffChart.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-semibold">
                {isKo ? "채널 예산 차이" : "Channel budget diff"}
              </p>
              <BudgetSplitDonut data={diffChart} />
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
