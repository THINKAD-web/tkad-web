"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ArrowRight, Play } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  getHomeAppearanceServerSnapshot,
  readHomeAppearance,
  subscribeHomeAppearance,
} from "@/lib/home-appearance";
import { cn } from "@/lib/utils";

type Props = {
  isKo: boolean;
};

function formatCompact(n: number) {
  if (n >= 1_000_000_000) return `${Math.round(n / 100_000_000) / 10}B`;
  if (n >= 1_000_000) return `${Math.round(n / 100_000) / 10}M`;
  if (n >= 10_000) return `${Math.round(n / 1000) / 10}K`;
  return n.toLocaleString();
}

export function HomeHeroNeo({ isKo }: Props) {
  const homeAppearance = useSyncExternalStore(
    subscribeHomeAppearance,
    readHomeAppearance,
    getHomeAppearanceServerSnapshot,
  );
  const isDay = homeAppearance === "day";

  // SSR/CSR hydration mismatch 방지: 첫 렌더(seed=0)는 고정, 마운트 후에만 drift 부여
  const [seed, setSeed] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setSeed(Date.now());
    const id = window.setInterval(() => setTick((t) => (t + 1) % 10_000), 900);
    return () => window.clearInterval(id);
  }, []);

  // “live” 느낌: 고정값 + tick 기반 미세 변동
  const liveImpressions = useMemo(() => {
    const base = 1_862_000;
    const drift = (seed % 7000) + tick * 137;
    return base + drift;
  }, [seed, tick]);

  const liveActiveBrands = useMemo(() => {
    const base = 128;
    const wobble = (tick % 9) - 4;
    return base + wobble;
  }, [tick]);

  return (
    <section
      className={cn(
        "tkad-home-hero tkad-neon-surface relative overflow-hidden bg-[#05050a]",
        isDay ? "text-slate-900" : "text-white",
      )}
    >
      <div aria-hidden className="absolute inset-0 tkad-neon-depth" />
      <div aria-hidden className="absolute inset-0 opacity-20 tkad-neon-grid" />
      <div aria-hidden className="tkad-hero-noise absolute inset-0 opacity-[0.07] mix-blend-overlay" />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.18),rgba(0,0,0,0.62),rgba(0,0,0,0.92))]" />

      <div className="relative mx-auto min-w-0 max-w-7xl px-4 pb-32 pt-28 sm:px-6 sm:pb-44 sm:pt-40 lg:px-8 lg:pb-56 lg:pt-48">
        <div className="mx-auto min-w-0 w-full max-w-6xl">
          {/* Top live signals */}
          <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
            <div className="tkad-home-hero__signals flex flex-wrap items-center gap-3 sm:min-w-0">
              <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 shadow-[0_24px_90px_rgba(0,0,0,0.7)] backdrop-blur">
                <span
                  className={cn(
                    "inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em]",
                    isDay ? "text-slate-800" : "text-white/92",
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#a855f7] shadow-[0_0_16px_rgba(168,85,247,0.55)]" />
                  LIVE
                </span>
                <span className={cn(isDay ? "text-slate-400" : "text-white/25")}>•</span>
                <span
                  className={cn(
                    "font-mono text-[11px] font-bold uppercase tracking-[0.22em]",
                    isDay ? "text-slate-600" : "text-white/65",
                  )}
                >
                  {isKo ? "오늘 누적 노출" : "Today impressions"}
                </span>
                <span
                  className={cn(
                    "font-display text-sm font-black tabular-nums tracking-tight",
                    isDay ? "text-slate-900" : "text-white",
                  )}
                >
                  {liveImpressions.toLocaleString()}
                </span>
              </div>

              <div
                className={cn(
                  "inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] backdrop-blur",
                  isDay ? "text-slate-600" : "text-white/70",
                )}
              >
                <span>{isKo ? "활성 브랜드" : "Active brands"}</span>
                <span className={cn(isDay ? "text-slate-400" : "text-white/25")}>—</span>
                <span className={cn(isDay ? "text-slate-900" : "text-white")}>
                  {liveActiveBrands}+
                </span>
              </div>

              <div
                className={cn(
                  "inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] backdrop-blur",
                  isDay ? "text-slate-600" : "text-white/70",
                )}
              >
                <span>{isKo ? "평균 응답" : "Avg. response"}</span>
                <span className={cn(isDay ? "text-slate-400" : "text-white/25")}>—</span>
                <span className={cn(isDay ? "text-slate-900" : "text-white")}>24h</span>
              </div>
            </div>

            <div
              className={cn(
                "hidden shrink-0 items-center gap-2 whitespace-nowrap font-mono text-[11px] font-bold uppercase tracking-[0.22em] sm:flex",
                isDay ? "text-slate-500" : "text-white/55",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isDay ? "bg-slate-400" : "bg-white/35",
                )}
              />
              {isKo ? "검증 후 등록만" : "Verified-only inventory"}
            </div>
          </div>

          <div className="mt-14 grid min-w-0 grid-cols-1 items-start gap-12 lg:mt-20 lg:grid-cols-12 lg:gap-14">
            {/* Copy — 라이트 모드에서 H1 비중 확대(8/4 그리드) */}
            <div className="min-w-0 lg:col-span-8">
              <p
                className={cn(
                  "font-mono text-[11px] font-bold uppercase tracking-[0.22em]",
                  isDay ? "text-slate-500" : "text-white/60",
                )}
              >
                {isKo ? "// Premium OOH Marketplace" : "// Premium OOH Marketplace"}
              </p>

              <h1
                className={cn(
                  "mt-6 text-balance text-[clamp(2.75rem,8.2vw,5.5rem)] font-[950] leading-[0.92] tracking-[-0.075em] sm:mt-7",
                  isDay
                    ? "text-slate-900"
                    : "text-white [text-shadow:0_30px_160px_rgba(0,0,0,0.9),0_0_14px_rgba(124,58,237,0.08),0_0_10px_rgba(34,211,238,0.05)]",
                )}
              >
                {isKo ? (
                  <>
                    검증된{" "}
                    <span className="tkad-home-accent-text">
                      광고매체
                    </span>
                    .
                    <br className="hidden sm:block" /> 예측 가능한 성과.
                  </>
                ) : (
                  <>
                    Verified{" "}
                    <span className="tkad-home-accent-text">
                      OOH
                    </span>
                    .
                    <br className="hidden sm:block" /> Predictable outcomes.
                  </>
                )}
              </h1>

              <p
                className={cn(
                  "mt-7 max-w-xl text-[15px] leading-relaxed sm:text-lg",
                  isDay ? "text-slate-600" : "text-white/80",
                )}
              >
                {isKo
                  ? "현장 검증 데이터로 매체를 비교하고, 예산에 맞는 믹스를 3분 만에 설계하세요. 견적부터 집행까지 원스톱으로."
                  : "Compare media with verified on-site data and build a budget-fit mix in minutes—from quote to execution."}
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/contact"
                  className="tkad-neon-cta-clean group inline-flex h-[74px] items-center justify-center gap-2 rounded-[24px] px-10 text-base font-black text-white transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:text-lg"
                >
                  {isKo ? "지금 시작하기" : "Start now"}
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </Link>

                <Link
                  href="/planner"
                  className={cn(
                    "group inline-flex h-[74px] items-center justify-center gap-2 rounded-[24px] border border-white/14 bg-white/6 px-10 text-base font-black shadow-[0_30px_120px_rgba(0,0,0,0.7)] backdrop-blur transition-all hover:-translate-y-1 hover:border-white/26 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:text-lg",
                    isDay ? "text-slate-900" : "text-white",
                  )}
                >
                  <Play className={cn("h-5 w-5", isDay ? "text-slate-600" : "text-white/80")} />
                  {isKo ? "2분 데모 보기" : "Watch 2‑min demo"}
                </Link>
              </div>

              <div className={cn("mt-7 flex flex-wrap items-center gap-2", isDay ? "text-slate-500" : "text-white/60")}>
                {[
                  isKo ? "4단계 검증" : "4-step verification",
                  isKo ? "가격·입지 비교" : "Price & location",
                  isKo ? "AI 매체 믹스" : "AI mix",
                ].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-2xl border border-white/12 bg-white/5 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] backdrop-blur"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            {/* Right glass panel — 보조 정보(좁은 컬럼) */}
            <div className="min-w-0 lg:col-span-4">
              <div className="relative min-w-0">
                <div
                  aria-hidden
                  className="absolute -inset-1 rounded-[28px] opacity-40 blur-2xl"
                  style={{
                    background:
                      "radial-gradient(circle at 30% 20%, rgba(168,85,247,0.52), transparent 55%), radial-gradient(circle at 70% 80%, rgba(34,211,238,0.24), transparent 55%), radial-gradient(circle at 85% 25%, rgba(236,72,153,0.22), transparent 55%)",
                  }}
                />
                <div className="tkad-home-hero__panel tkad-neon-border tkad-neon-glow relative min-w-0 rounded-[28px] bg-white/6 p-6 backdrop-blur">
                  <div className="flex min-w-0 items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "font-mono text-[11px] font-bold uppercase tracking-[0.22em]",
                          isDay ? "text-slate-500" : "text-white/58",
                        )}
                      >
                        {isKo ? "실시간 시그널" : "Signals"}
                      </p>
                      <p
                        className={cn(
                          "mt-3 text-[40px] font-black leading-none tracking-[-0.04em]",
                          isDay ? "text-slate-800" : "text-white",
                        )}
                      >
                        {formatCompact(86_000 + (tick % 60) * 143)}
                      </p>
                      <p
                        className={cn(
                          "mt-2 text-sm font-semibold",
                          isDay ? "text-slate-600" : "text-white/72",
                        )}
                      >
                        {isKo ? "이번 주 추천 매체 예상 노출" : "Est. impressions (recommended this week)"}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "inline-flex shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em]",
                        isDay ? "text-slate-600" : "text-white/75",
                      )}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-[#7C3AED]" />
                      Live
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    {[
                      { k: isKo ? "검증 매체" : "Verified media", v: "500+" },
                      { k: isKo ? "파트너" : "Partners", v: "100+" },
                      { k: isKo ? "평균 응답" : "Response", v: "24h" },
                      { k: isKo ? "집행 지원" : "Execution", v: "E2E" },
                    ].map((s) => (
                      <div key={s.k} className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                        <p
                          className={cn(
                            "font-mono text-[10px] font-bold uppercase tracking-[0.22em]",
                            isDay ? "text-slate-500" : "text-white/58",
                          )}
                        >
                          {s.k}
                        </p>
                        <p
                          className={cn(
                            "mt-2 text-lg font-black tracking-tight",
                            isDay ? "text-slate-800" : "text-white",
                          )}
                        >
                          {s.v}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <p
                      className={cn(
                        "font-mono text-[10px] font-bold uppercase tracking-[0.22em]",
                        isDay ? "text-slate-500" : "text-white/58",
                      )}
                    >
                      {isKo ? "지금 가장 뜨는 카테고리" : "Trending category"}
                    </p>
                    <p
                      className={cn(
                        "mt-2 text-sm font-semibold",
                        isDay ? "text-slate-700" : "text-white/82",
                      )}
                    >
                      {isKo ? "도심 디지털 · 교통 거점" : "Urban digital · transit hubs"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

