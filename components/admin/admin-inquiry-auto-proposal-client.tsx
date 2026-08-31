"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { PILOT_DEFAULT_INQUIRY_TEXT } from "@/lib/inquiry-auto-proposal/pilot-skus";
import { GMAIL_INBOUND_NEXT_ROUND_STEPS_KO } from "@/lib/inquiry-auto-proposal/gmail-inbound-next-round";

type Matched = {
  id: string;
  name: string;
  monthlyWon: number;
  matchKind: string;
  eligible: boolean;
  reasons: string[];
  sellingUnitUndeclared: boolean;
  cpmWon: number | null;
};

type DryRun = {
  parsed: {
    budgetWon: number;
    budgetAssumed: boolean;
    months: number;
    wantsAirport: boolean;
    wantsRestStopLed: boolean;
    namedNeedles: string[];
  };
  matched: Matched[];
  designatedCount?: number;
  eligibleCount: number;
  excludedCount: number;
  mixUnits: Record<string, number>;
  bodyTotalWon?: number;
  appendixMediaSpecs?: {
    id: string;
    name: string;
    priceLabel: string;
    cpmLabel: string;
    location: string;
    reviewStatusLabel: string;
    inBody: boolean;
    statusNote: string;
  }[];
  brief: {
    budgetInputWon: number;
    budgetMode: string;
    flightStart: string | null;
    flightEnd: string | null;
  };
  snapshot: {
    totalCostWon: number;
    overBudgetWon: number;
    budgetUsedRate: number;
    totalImpressions: number;
    mixCpmWon: number | null;
    netReach: number;
  } | null;
  thumbs: { id?: string; name: string; thumbUrl: string | null }[];
};

function won(n: number) {
  return `₩${n.toLocaleString("ko-KR")}`;
}

export function AdminInquiryAutoProposalClient() {
  const [text, setText] = useState(PILOT_DEFAULT_INQUIRY_TEXT);
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState<"dry" | "send" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [result, setResult] = useState<DryRun | null>(null);

  async function runDry() {
    setBusy("dry");
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/inquiry-auto-proposal/dry-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json()) as DryRun & { error?: string };
      if (!res.ok) throw new Error(data.error ?? `http_${res.status}`);
      setResult(data);
      const thumbOk = (data.thumbs ?? []).filter((t) => t.thumbUrl).length;
      setMsg(
        `지정 ${data.designatedCount ?? "—"} · 본문 ${Object.keys(data.mixUnits).length} · 부록 ${data.appendixMediaSpecs?.length ?? 0} · 썸네일 ${thumbOk}/${data.thumbs?.length ?? 0}`,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "dry_run_failed");
    } finally {
      setBusy(null);
    }
  }

  async function sendTest() {
    if (!result || Object.keys(result.mixUnits).length === 0) {
      setErr("본문에 담길 매체가 없습니다");
      return;
    }
    setBusy("send");
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/inquiry-auto-proposal/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, to }),
      });
      const data = (await res.json()) as {
        error?: string;
        to?: string;
        names?: string[];
      };
      if (!res.ok) throw new Error(data.error ?? `http_${res.status}`);
      setMsg(`테스트 발송 완료 → ${data.to} (${data.names?.join(" + ")})`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "send_failed");
    } finally {
      setBusy(null);
    }
  }

  const excluded = result?.matched.filter((m) => !m.eligible) ?? [];
  const eligible = result?.matched.filter((m) => m.eligible) ?? [];
  const bodyIds = new Set(Object.keys(result?.mixUnits ?? {}));

  return (
    <div className="space-y-6 text-foreground">
      <header className="space-y-2">
        <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
          [ INQUIRY AUTO PROPOSAL ]
        </p>
        <h1 className="text-xl font-bold tracking-tight">문의 자동 매칭 dry-run</h1>
        <p className="text-[11px] tracking-tight text-muted-foreground">
          {`// `}인바운드 메일은 아직 없음. 본문 → 매체 id → Step 3와 동일 스냅샷.
          발송은 @tkad.co.kr 등 테스트 주소만.
        </p>
      </header>

      <section className="space-y-3 border-2 border-border bg-card p-4">
        <label className="block text-xs font-display uppercase tracking-[0.18em] text-muted-foreground">
          문의 본문
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          className="w-full border-2 border-border bg-background p-3 text-sm"
        />
        <button
          type="button"
          onClick={() => void runDry()}
          disabled={busy !== null}
          className="inline-flex h-11 items-center gap-2 border-2 border-border bg-foreground px-4 font-display text-xs font-medium uppercase tracking-[0.18em] text-background disabled:opacity-50"
        >
          {busy === "dry" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          dry-run 실행
        </button>
      </section>

      {err ? <p className="text-sm text-destructive">{err}</p> : null}
      {msg ? <p className="text-sm text-foreground">{msg}</p> : null}

      {result ? (
        <>
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { label: "예산", value: won(result.parsed.budgetWon) },
              {
                label: "기간",
                value:
                  result.brief.flightStart && result.brief.flightEnd
                    ? `${result.brief.flightStart} ~ ${result.brief.flightEnd}`
                    : `${result.parsed.months}개월`,
              },
              { label: "통과", value: `${result.eligibleCount}` },
              { label: "지정", value: `${result.designatedCount ?? "—"}` },
              { label: "본문", value: `${Object.keys(result.mixUnits).length}` },
              { label: "제외", value: `${result.excludedCount}` },
            ].map((s) => (
              <div key={s.label} className="border-2 border-border bg-card p-4">
                <p className="font-display text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {s.label}
                </p>
                <p className="mt-1 text-lg font-bold tabular-nums">{s.value}</p>
              </div>
            ))}
          </section>
          {result.parsed.budgetAssumed ? (
            <p className="text-[11px] text-amber-800">
              예산이 본문에서 확실하지 않아 3,000만원으로 가정했습니다.
            </p>
          ) : null}

          {result.snapshot ? (
            <section className="grid grid-cols-2 gap-3 xl:grid-cols-3">
              {[
                { label: "Step3 총비용", value: won(result.snapshot.totalCostWon) },
                {
                  label: "요청 대비",
                  value: `${Math.round(result.snapshot.budgetUsedRate * 100)}%`,
                },
                {
                  label: "예산 초과",
                  value:
                    result.snapshot.overBudgetWon > 0
                      ? won(result.snapshot.overBudgetWon)
                      : "없음",
                },
                {
                  label: "Step3 총노출",
                  value: result.snapshot.totalImpressions.toLocaleString("ko-KR"),
                },
                {
                  label: "Step3 믹스 CPM",
                  value:
                    result.snapshot.mixCpmWon != null
                      ? won(result.snapshot.mixCpmWon)
                      : "—",
                },
              ].map((s) => (
                <div key={s.label} className="border-2 border-border bg-card p-4">
                  <p className="font-display text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {s.label}
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums">{s.value}</p>
                </div>
              ))}
            </section>
          ) : null}

          <section className="space-y-2">
            <h2 className="font-display text-xs uppercase tracking-[0.18em] text-emerald-800">
              [ 본문 mix · CPM 오름차순 그리디 ]
            </h2>
            <ul className="space-y-1 text-sm">
              {Object.keys(result.mixUnits).map((id) => {
                const m = result.matched.find((x) => x.id === id);
                if (!m) return null;
                return (
                  <li key={m.id} className="border border-border px-3 py-2">
                    <span className="font-medium">{m.name}</span>
                    <span className="ml-2 tabular-nums text-muted-foreground">
                      {won(m.monthlyWon)}
                      {m.cpmWon != null
                        ? ` · CPM ₩${Math.round(m.cpmWon).toLocaleString("ko-KR")}`
                        : ""}
                      {m.sellingUnitUndeclared ? " · 확인 후 회신" : ""}
                    </span>
                  </li>
                );
              })}
              {Object.keys(result.mixUnits).length === 0 ? (
                <li className="text-muted-foreground">없음</li>
              ) : null}
            </ul>
            {result.bodyTotalWon != null ? (
              <p className="text-[11px] text-muted-foreground">
                본문 합계 {won(result.bodyTotalWon)} / 예산 {won(result.parsed.budgetWon)}
              </p>
            ) : null}
          </section>

          {result.appendixMediaSpecs && result.appendixMediaSpecs.length > 0 ? (
            <section className="space-y-2">
              <h2 className="font-display text-xs uppercase tracking-[0.18em] text-muted-foreground">
                [ 부록 · 지정 매체 스펙 ({result.appendixMediaSpecs.length}) ]
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-2 py-2">매체</th>
                      <th className="px-2 py-2">월 가격</th>
                      <th className="px-2 py-2">CPM</th>
                      <th className="px-2 py-2">위치</th>
                      <th className="px-2 py-2">검토</th>
                      <th className="px-2 py-2">본문</th>
                      <th className="px-2 py-2">비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.appendixMediaSpecs.map((row) => (
                      <tr key={row.id} className="border-b border-border/60">
                        <td className="px-2 py-2 font-medium">{row.name}</td>
                        <td className="px-2 py-2 tabular-nums">{row.priceLabel}</td>
                        <td className="px-2 py-2 tabular-nums">{row.cpmLabel}</td>
                        <td className="px-2 py-2 text-muted-foreground">{row.location}</td>
                        <td className="px-2 py-2">{row.reviewStatusLabel}</td>
                        <td className="px-2 py-2">{row.inBody ? "포함" : "—"}</td>
                        <td className="px-2 py-2 text-muted-foreground">{row.statusNote}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <section className="space-y-2">
            <h2 className="font-display text-xs uppercase tracking-[0.18em] text-emerald-800">
              [ 필터 통과 후보 (지정 매체) ]
            </h2>
            <ul className="space-y-1 text-sm">
              {eligible
                .filter((m) => m.matchKind === "named" || m.matchKind === "pilot")
                .map((m) => (
                <li key={m.id} className="border border-border px-3 py-2">
                  <span className="font-medium">{m.name}</span>
                  <span className="ml-2 tabular-nums text-muted-foreground">
                    {won(m.monthlyWon)}
                    {bodyIds.has(m.id) ? " · 본문 포함" : " · 본문 제외"}
                    {m.cpmWon != null
                      ? ` · CPM ₩${Math.round(m.cpmWon).toLocaleString("ko-KR")}`
                      : ""}
                    {m.sellingUnitUndeclared ? " · 확인 후 회신" : ""}
                  </span>
                </li>
              ))}
              {eligible.length === 0 ? (
                <li className="text-muted-foreground">없음</li>
              ) : null}
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-xs uppercase tracking-[0.18em] text-rose-800">
              [ 자동 제외 ]
            </h2>
            <ul className="space-y-1 text-sm">
              {excluded.map((m) => (
                <li key={m.id} className="border border-border px-3 py-2">
                  <span className="font-medium">{m.name}</span>
                  <span className="ml-2 text-muted-foreground">
                    {m.reasons.join(", ")}
                  </span>
                </li>
              ))}
              {excluded.length === 0 ? (
                <li className="text-muted-foreground">없음</li>
              ) : null}
            </ul>
          </section>

          {result.thumbs.length > 0 ? (
            <section className="space-y-2">
              <h2 className="font-display text-xs uppercase tracking-[0.18em] text-muted-foreground">
                [ PDF 썸네일 소스 ]
              </h2>
              <ul className="space-y-1 text-sm">
                {result.thumbs.map((t) => (
                  <li key={t.id ?? t.name} className="border border-border px-3 py-2">
                    <span className="font-medium">{t.name}</span>
                    <span className="ml-2 break-all text-muted-foreground">
                      {t.thumbUrl ?? "없음"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="space-y-3 border-2 border-border bg-card p-4">
            <h2 className="font-display text-xs uppercase tracking-[0.18em] text-muted-foreground">
              [ Step 3 제안서 · 테스트 발송 ]
            </h2>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="테스트 수신 (예: you@tkad.co.kr)"
                className="h-11 flex-1 border-2 border-border bg-background px-3 text-sm"
              />
              <button
                type="button"
                onClick={() => void sendTest()}
                disabled={busy !== null || !result.snapshot}
                className="inline-flex h-11 items-center justify-center gap-2 border-2 border-border px-4 font-display text-xs font-medium uppercase tracking-[0.18em] disabled:opacity-50"
              >
                {busy === "send" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                테스트 발송
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              고객 도메인(gmail 등)은 거부합니다. 추가 주소는
              INQUIRY_AUTO_PROPOSAL_TEST_TO.
            </p>
          </section>
        </>
      ) : null}

      <details className="border border-border p-4 text-sm">
        <summary className="cursor-pointer font-display text-xs uppercase tracking-[0.18em] text-muted-foreground">
          다음 라운드 · Gmail Workspace 전달 (미구현)
        </summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted-foreground">
          {GMAIL_INBOUND_NEXT_ROUND_STEPS_KO.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </details>
    </div>
  );
}
