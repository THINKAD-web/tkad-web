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

type Option = {
  optionId: string;
  kind: "single" | "combo";
  names: string[];
  monthlyWon: number;
  sellingUnitFollowUp: boolean;
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
  eligibleCount: number;
  excludedCount: number;
  options: Option[];
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
  const [optionId, setOptionId] = useState<string>("");

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
      setOptionId(data.options[0]?.optionId ?? "");
      setMsg(
        `매칭 ${data.matched.length} · 통과 ${data.eligibleCount} · 제외 ${data.excludedCount} · 옵션 ${data.options.length}`,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "dry_run_failed");
    } finally {
      setBusy(null);
    }
  }

  async function sendTest() {
    if (!optionId) {
      setErr("옵션을 선택하세요");
      return;
    }
    setBusy("send");
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/inquiry-auto-proposal/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, optionId, to }),
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

  return (
    <div className="space-y-6 text-foreground">
      <header className="space-y-2">
        <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
          [ INQUIRY AUTO PROPOSAL ]
        </p>
        <h1 className="text-xl font-bold tracking-tight">문의 자동 매칭 dry-run</h1>
        <p className="text-[11px] tracking-tight text-muted-foreground">
          {`// `}인바운드 메일은 아직 없음. 본문 붙여넣기 → 필터 SSOT(flagged · class
          CPM_BOUNDS) → 제안서. 발송은 @tkad.co.kr 등 테스트 주소만.
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

      {err ? (
        <p className="text-sm text-destructive">{err}</p>
      ) : null}
      {msg ? (
        <p className="text-sm text-foreground">{msg}</p>
      ) : null}

      {result ? (
        <>
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { label: "예산", value: won(result.parsed.budgetWon) },
              { label: "기간", value: `${result.parsed.months}개월` },
              { label: "통과", value: `${result.eligibleCount}` },
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

          <section className="space-y-2">
            <h2 className="font-display text-xs uppercase tracking-[0.18em] text-emerald-800">
              [ 통과 후보 ]
            </h2>
            <ul className="space-y-1 text-sm">
              {eligible.map((m) => (
                <li key={m.id} className="border border-border px-3 py-2">
                  <span className="font-medium">{m.name}</span>
                  <span className="ml-2 tabular-nums text-muted-foreground">
                    {won(m.monthlyWon)}
                    {m.cpmWon != null ? ` · CPM ₩${Math.round(m.cpmWon).toLocaleString("ko-KR")}` : ""}
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

          <section className="space-y-3 border-2 border-border bg-card p-4">
            <h2 className="font-display text-xs uppercase tracking-[0.18em] text-muted-foreground">
              [ 옵션 · 테스트 발송 ]
            </h2>
            <div className="space-y-2">
              {result.options.map((o) => (
                <label
                  key={o.optionId}
                  className="flex cursor-pointer items-start gap-2 border border-border px-3 py-2 text-sm"
                >
                  <input
                    type="radio"
                    name="option"
                    checked={optionId === o.optionId}
                    onChange={() => setOptionId(o.optionId)}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">{o.kind === "single" ? "단일" : "조합"}</span>
                    {" · "}
                    {o.names.join(" + ")}
                    <span className="ml-2 tabular-nums text-muted-foreground">
                      {won(o.monthlyWon)}
                      {o.sellingUnitFollowUp ? " · 확인 후 회신" : ""}
                    </span>
                  </span>
                </label>
              ))}
              {result.options.length === 0 ? (
                <p className="text-sm text-muted-foreground">예산 내 옵션 없음</p>
              ) : null}
            </div>
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
                disabled={busy !== null || !optionId}
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
