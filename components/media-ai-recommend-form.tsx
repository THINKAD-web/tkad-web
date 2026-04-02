"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Building2,
  Bus,
  CalendarDays,
  Layers,
  MapPin,
  Monitor,
  PanelTop,
  Search,
  Sparkles,
  Store,
  Target,
  TrainFront,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  PLACEMENT_HINT_KEYS,
  type AiRecommendInput,
  type Industry,
  type TargetAudience,
} from "@/lib/ai-media-recommend";
import { Input } from "@/components/ui/input";

export type RegionCheckboxCode =
  | "seoul"
  | "capital"
  | "busan"
  | "jeju"
  | "national";

type AgeBand = "teens" | "twenties" | "thirties" | "forties";
type PeriodWeeks = 1 | 2 | 4 | 12;

function mapAgeBands(bands: ReadonlySet<AgeBand>): TargetAudience {
  if (bands.size === 0) return "mass";
  if (
    bands.has("forties") &&
    !bands.has("twenties") &&
    !bands.has("thirties") &&
    !bands.has("teens")
  ) {
    return "family";
  }
  if (bands.has("teens") && bands.size === 1) return "genz";
  if (bands.has("twenties") || bands.has("thirties")) return "millennial";
  if (bands.has("teens")) return "genz";
  if (bands.has("forties")) return "family";
  return "mass";
}

export type MediaAiRecommendFormSubmit = {
  input: AiRecommendInput;
  /** 선택 지역(빈 배열이면 전국·필터 없음) */
  regionCodes: RegionCheckboxCode[];
  /** 매체명·지역 등 텍스트 검색(비어 있으면 무시) */
  searchQuery: string;
};

type Props = {
  locale: string;
  onSubmit: (payload: MediaAiRecommendFormSubmit) => void;
};

type MediaTypeFilter = "all" | "digital" | "static" | "mobile" | "network";

export default function MediaAiRecommendForm({ locale, onSubmit }: Props) {
  const tr = useTranslations("recommend");
  const tPlacement = useTranslations("recommend.form.placementHints");
  const isKo = locale === "ko";

  const [regions, setRegions] = useState<Set<RegionCheckboxCode>>(
    () => new Set(["seoul"]),
  );
  const [ageBands, setAgeBands] = useState<Set<AgeBand>>(
    () => new Set(["twenties", "thirties"]),
  );
  const [budgetMan, setBudgetMan] = useState(3000);
  const [industry, setIndustry] = useState<Industry>("beauty");
  const [periodWeeks, setPeriodWeeks] = useState<PeriodWeeks>(2);
  const [searchQuery, setSearchQuery] = useState("");
  const [mediaType, setMediaType] = useState<MediaTypeFilter>("all");
  const [placementHints, setPlacementHints] = useState<Set<string>>(
    () => new Set(),
  );

  const budgetMin = 100;
  const budgetMax = 10000;

  const toggleRegion = useCallback((code: RegionCheckboxCode) => {
    setRegions((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  const toggleAge = useCallback((b: AgeBand) => {
    setAgeBands((prev) => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b);
      else next.add(b);
      return next;
    });
  }, []);

  const togglePlacementHint = useCallback((code: string) => {
    setPlacementHints((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  const regionDef = useMemo(
    () =>
      [
        { code: "seoul" as const, label: tr("form.regionSeoul") },
        { code: "capital" as const, label: tr("form.regionGyeonggi") },
        { code: "busan" as const, label: tr("form.regionBusan") },
        { code: "jeju" as const, label: tr("form.regionJeju") },
        { code: "national" as const, label: tr("form.regionNational") },
      ] as const,
    [tr],
  );

  const ageDef = useMemo(
    () =>
      [
        { code: "teens" as const, label: tr("form.ageTeens") },
        { code: "twenties" as const, label: tr("form.ageTwenties") },
        { code: "thirties" as const, label: tr("form.ageThirties") },
        { code: "forties" as const, label: tr("form.ageForties") },
      ] as const,
    [tr],
  );

  const periodDef = useMemo(
    () =>
      [
        { w: 1 as const, label: tr("form.period1w") },
        { w: 2 as const, label: tr("form.period2w") },
        { w: 4 as const, label: tr("form.period1m") },
        { w: 12 as const, label: tr("form.period3m") },
      ] as const,
    [tr],
  );

  const industryOptions: { value: Industry; label: string }[] = useMemo(
    () => [
      { value: "beauty", label: tr("form.industryBeauty") },
      { value: "retail", label: tr("form.industryRetail") },
      { value: "fmcg", label: tr("form.industryFmcg") },
      { value: "fintech", label: tr("form.industryFintech") },
      { value: "auto", label: tr("form.industryAuto") },
      { value: "entertainment", label: tr("form.industryEntertainment") },
      { value: "other", label: tr("form.industryOther") },
    ],
    [tr],
  );

  const mediaTypeOptions: { value: MediaTypeFilter; label: string }[] = useMemo(
    () => [
      { value: "all", label: tr("form.mediaTypeAll") },
      { value: "digital", label: tr("form.mediaTypeDigital") },
      { value: "static", label: tr("form.mediaTypeStatic") },
      { value: "mobile", label: tr("form.mediaTypeMobile") },
      { value: "network", label: tr("form.mediaTypeNetwork") },
    ],
    [tr],
  );

  const handleSubmit = () => {
    if (ageBands.size === 0) return;
    const target = mapAgeBands(ageBands);
    const regionCodes = [...regions];
    let regionCode: AiRecommendInput["region"] = "all";
    if (regionCodes.length === 1) {
      regionCode = regionCodes[0];
    }

    const hints =
      placementHints.size > 0 ? [...placementHints] : undefined;

    const input: AiRecommendInput = {
      goal: "awareness",
      target,
      budgetMaxMan: Math.round(budgetMan),
      region: regionCode,
      industry,
      preferredPeriodWeeks: periodWeeks,
      type: mediaType === "all" ? "all" : mediaType,
      placementHints: hints,
    };

    onSubmit({ input, regionCodes, searchQuery });
  };

  const canSubmit = ageBands.size > 0;

  const summary = useMemo(() => {
    const regionLabels = regionDef
      .filter((r) => regions.has(r.code))
      .map((r) => r.label);
    const ageLabels = ageDef
      .filter((a) => ageBands.has(a.code))
      .map((a) => a.label);
    const industryLabel =
      industryOptions.find((o) => o.value === industry)?.label ??
      (isKo ? "전체 업종" : "All industries");
    const periodLabel =
      periodDef.find((p) => p.w === periodWeeks)?.label ??
      (isKo ? "기간 미정" : "Flexible period");

    return {
      region:
        regionLabels.length === 0
          ? isKo
            ? "전체 지역"
            : "All regions"
          : regionLabels.join(", "),
      age:
        ageLabels.length === 0
          ? isKo
            ? "전 연령"
            : "All ages"
          : ageLabels.join(", "),
      industry: industryLabel,
      period: periodLabel,
    };
  }, [ageBands, ageDef, industry, industryOptions, isKo, periodDef, periodWeeks, regionDef, regions]);

  const maddyMessage = useMemo(() => {
    if (!isKo) {
      const hasYoung = ageBands.has("teens") || ageBands.has("twenties");
      const hasFamily =
        ageBands.has("forties") && !hasYoung;
      const hasNight =
        Array.from(placementHints).some((code) =>
          code.toLowerCase().includes("night"),
        );

      if (hasYoung && (industry === "entertainment" || industry === "beauty")) {
        return "TKAD bot: Oho, big fandom energy detected. I’ll sweep Hongdae and Gangnam for hype-ready hero screens that feel tailor‑made for your crowd.";
      }
      if (hasYoung && hasNight) {
        return "TKAD bot: Night‑owl crew spotted. I’ll light up neon city routes that really wake up after dark and catch late‑night selfies.";
      }
      if (hasYoung) {
        return "TKAD bot: Fresh, active audience locked in. I’ll lean toward vivid hangout spots where foot traffic and buzz both spike.";
      }
      if (hasFamily) {
        return "TKAD bot: Family routes it is. I’ll trace everyday paths—malls, grocery hubs, family stops—where trust and repetition work together.";
      }
      if (industry === "fintech" || industry === "auto") {
        return "TKAD bot: High‑trust category detected. I’ll prioritize premium, credible business corridors where the placements feel “safe but strong.”";
      }
      if (budgetMan >= 7000) {
        return "TKAD bot: Bold budget detected. Instead of a tiny test, let’s sketch a city‑spanning hero route that really feels like a launch.";
      }
      if (budgetMan <= 1000) {
        return "TKAD bot: Compact budget mode, got it. I’ll snipe a few sharp, high‑efficiency placements where every slot has to pull its weight.";
      }
      return "TKAD bot: Got it. I’ll balance reach, vibe, and efficiency to build a clean first route that still feels a bit like a hidden‑gem tour.";
    }

    const hasYoung =
      ageBands.has("teens") || ageBands.has("twenties");
    const hasFamily =
      ageBands.has("forties") && !hasYoung;

    const hasNight =
      Array.from(placementHints).some((code) =>
        code.toLowerCase().includes("night"),
      );

    if (hasYoung && (industry === "entertainment" || industry === "beauty")) {
      return "오호~ 딱 젊은 팬덤 타겟이네요! 🔥 TKAD bot이 홍대·강남 일대에서 팬덤이 좋아할 만한 찰떡 매체만 골라볼게요.";
    }
    if (hasYoung && hasNight) {
      return "야간형 젊은 타겟이라… 딱 제 취향이에요. ✨ 네온 간판 맛집, 심야 핫플 위주로 보석 같은 스팟만 좁혀볼게요.";
    }
    if (hasYoung) {
      return "에너지 터지는 타겟이군요! 유동 인구가 빵 터지는 구간을 위주로, 궁합 좋아 보이는 스팟만 골라볼게요.";
    }
    if (hasFamily) {
      return "가족 단위 비중이 크네요. 마트·쇼핑몰·생활 동선 중심으로, 매일 스쳐 지나가는 신뢰형 매체부터 차근차근 탐험해볼게요.";
    }
    if (industry === "fintech" || industry === "auto") {
      return "신뢰와 전문성이 핵심인 업종이네요. TKAD bot이 프리미엄 입지·비즈니스 동선 위주로 차분하게 스캔해볼게요.";
    }
    if (budgetMan >= 7000) {
      return "오호~ 제법 든든한 예산이네요. 도시 한 바퀴를 두르는 ‘존재감 폭발’ 루트를 한번 상상해볼게요. 💡";
    }
    if (budgetMan <= 1000) {
      return "예산은 슬림하지만 괜찮아요. TKAD bot이 숨겨진 보석 느낌의 알짜 매체 몇 곳만 정확히 찔러볼게요.";
    }
    return "좋아요! TKAD bot이 지금 조건에 맞는 매체들을 하나씩 꿰어서, 궁합 좋은 조합으로 세트업하는 중이에요.";
  }, [ageBands, budgetMan, industry, isKo, placementHints]);

  const handleSurprise = () => {
    const pickRandom = <T,>(arr: readonly T[]): T =>
      arr[Math.floor(Math.random() * arr.length)];

    const randomRegionCodes = (() => {
      const codes = regionDef.map((r) => r.code);
      const count = Math.max(1, Math.min(3, Math.floor(Math.random() * 4)));
      const picked = new Set<RegionCheckboxCode>();
      while (picked.size < count) {
        picked.add(pickRandom(codes));
      }
      return [...picked];
    })();

    const randomAgeBands = (() => {
      const codes = ageDef.map((a) => a.code);
      const count = Math.max(1, Math.min(3, Math.floor(Math.random() * 4)));
      const picked = new Set<AgeBand>();
      while (picked.size < count) {
        picked.add(pickRandom(codes));
      }
      return picked;
    })();

    const randomIndustry = pickRandom(industryOptions).value;
    const randomPeriod = pickRandom(periodDef).w;
    const randomMediaType = pickRandom(mediaTypeOptions).value;

    const randomHints = (() => {
      const count = Math.floor(Math.random() * 3);
      const picked = new Set<string>();
      while (picked.size < count) {
        picked.add(pickRandom(PLACEMENT_HINT_KEYS));
      }
      return picked;
    })();

    setRegions(new Set(randomRegionCodes));
    setAgeBands(new Set(randomAgeBands));
    setIndustry(randomIndustry);
    setPeriodWeeks(randomPeriod);
    setMediaType(randomMediaType);
    setPlacementHints(new Set(randomHints));

    const target = mapAgeBands(randomAgeBands);
    let regionCode: AiRecommendInput["region"] = "all";
    if (randomRegionCodes.length === 1) {
      regionCode = randomRegionCodes[0];
    }

    const hints =
      randomHints.size > 0 ? [...randomHints] : undefined;

    const input: AiRecommendInput = {
      goal: "awareness",
      target,
      budgetMaxMan: Math.round(budgetMan),
      region: regionCode,
      industry: randomIndustry,
      preferredPeriodWeeks: randomPeriod,
      type: randomMediaType === "all" ? "all" : randomMediaType,
      placementHints: hints,
    };

    onSubmit({
      input,
      regionCodes: randomRegionCodes,
      searchQuery,
    });
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card className="border border-navy/20 bg-gradient-to-b from-slate-900 via-navy to-slate-900 text-slate-50 shadow-2xl">
        <CardHeader className="border-b border-slate-700/60 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1.5">
              <p className="inline-flex items-center gap-2 rounded-full bg-slate-800/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gold">
                <Sparkles className="h-3 w-3" aria-hidden />
                <span>
                  {isKo ? "AI 매체 탐험가 · TKAD bot" : "AI Media Explorer · TKAD bot"}
                </span>
              </p>
              <CardTitle className="mt-2 text-lg font-extrabold text-gold sm:text-xl">
                {isKo
                  ? "TKAD bot과 함께 매체 탐험 시작! ✨"
                  : tr("form.panelTitle")}
              </CardTitle>
              <p className="mt-1 text-xs text-slate-200 sm:text-sm">
                {isKo
                  ? "원하는 분위기와 조건을 알려주세요. TKAD bot이 딱 맞는 매체를 찾아줄게요!"
                  : tr("form.panelSubtitle")}
              </p>
            </div>
            <div className="relative flex h-20 w-20 items-center justify-center">
              <div className="absolute -top-6 right-10 hidden max-w-[160px] rounded-2xl bg-slate-800/95 px-3 py-2 text-[11px] text-slate-50 shadow-lg ring-1 ring-slate-600 sm:block">
                <span className="block">
                  {isKo
                    ? "어떤 매체를 찾으러 갈까? 조건을 알려줘!"
                    : "Tell me the vibe. I’ll find your perfect screens!"}
                </span>
                <span className="absolute -bottom-2 right-6 h-3 w-3 rotate-45 bg-slate-800/95" />
              </div>
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-amber-500 shadow-lg ring-2 ring-gold/70">
                <span className="text-2xl" aria-hidden>
                  🤖
                </span>
                <span className="pointer-events-none absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/95 px-2 py-0.5 text-[10px] font-semibold text-gold shadow">
                  TKAD bot
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-slate-300 sm:text-xs">
              {maddyMessage}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="inline-flex items-center gap-1 rounded-full border-emerald-300/80 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-200 shadow-sm transition-transform hover:scale-[1.03] hover:bg-emerald-400/20"
              onClick={handleSurprise}
            >
              <Sparkles className="h-3 w-3" />
              {isKo ? "랜덤 탐험 시작!" : "Surprise me"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-7 pt-6">
          <section className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-gold">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              {isKo ? "TKAD Bot 추천 지역" : tr("form.regionLabel")}
            </div>
            <div className="flex flex-wrap gap-2">
              {regionDef.map(({ code, label }) => (
                <label
                  key={code}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors sm:text-sm",
                    regions.has(code)
                      ? "border-gold/70 bg-gold/20 text-slate-950"
                      : "border-slate-700/70 bg-slate-900/80 text-slate-200 hover:border-gold/40",
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={regions.has(code)}
                    onChange={() => toggleRegion(code)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-50">
              <Store className="h-4 w-4 shrink-0" aria-hidden />
              {isKo ? "이번 탐험 준비 현황" : "Your exploration setup"}
            </div>
            <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3 text-[11px] text-slate-200 sm:text-xs">
              <div className="flex flex-wrap gap-y-1">
                <span className="mr-2 font-semibold text-gold">
                  {isKo ? "지역" : "Region"}:
                </span>
                <span>{summary.region}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-y-1">
                <span className="mr-2 font-semibold text-gold">
                  {isKo ? "연령" : "Ages"}:
                </span>
                <span>{summary.age}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-y-1">
                <span className="mr-2 font-semibold text-gold">
                  {isKo ? "업종" : "Industry"}:
                </span>
                <span>{summary.industry}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-y-1">
                <span className="mr-2 font-semibold text-gold">
                  {isKo ? "기간" : "Period"}:
                </span>
                <span>{summary.period}</span>
              </div>
              <div className="mt-3 rounded-xl bg-slate-800/80 px-3 py-2 text-[11px] text-emerald-200 sm:text-xs">
                {isKo
                  ? "이 정도면 출발 준비는 끝났어요. 마음에 안 들면 언제든 Remix로 다른 코스를 타볼 수 있어요."
                  : "Looks like we’re ready to launch. You can always hit Remix later if you want a different route."}
              </div>
            </div>
          </section>

          <section className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-50">
              <Search className="h-4 w-4 shrink-0" aria-hidden />
              {tr("form.searchLabel")}
            </div>
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isKo
                  ? "예: 강남 지하철, 홍대 거리 가구, 코엑스 빌보드…"
                  : tr("form.searchPlaceholder")
              }
              className="border-slate-600 bg-slate-950/80 text-slate-50 placeholder:text-slate-400"
            />
          </section>

          <section className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-50">
              <Monitor className="h-4 w-4 shrink-0" aria-hidden />
              {isKo ? "탐험할 매체 유형을 골라주세요" : tr("form.mediaTypeLabel")}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {mediaTypeOptions.map((o) => {
                const selected = mediaType === o.value;
                const icon =
                  o.value === "all"
                    ? Sparkles
                    : o.value === "digital"
                      ? Monitor
                      : o.value === "static"
                        ? PanelTop
                        : o.value === "mobile"
                          ? Bus
                          : TrainFront;
                const Icon = icon;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setMediaType(o.value)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left text-xs sm:text-sm",
                      selected
                        ? "border-emerald-400 bg-emerald-400/10 text-emerald-100"
                        : "border-slate-700/70 bg-slate-900/60 text-slate-200 hover:border-emerald-300/70",
                    )}
                  >
                    <Icon className="h-4 w-4 text-emerald-300" aria-hidden />
                    <span className="font-semibold">{o.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-50">
              <Layers className="h-4 w-4 shrink-0" aria-hidden />
              {isKo
                ? "TKAD Bot이 탐험할 노출 환경을 골라주세요"
                : tr("form.placementHintsLabel")}
            </div>
            <div className="flex flex-wrap gap-2">
              {PLACEMENT_HINT_KEYS.map((code) => (
                <label
                  key={code}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors sm:text-sm",
                    placementHints.has(code)
                      ? "border-emerald-400/80 bg-emerald-400/15 text-emerald-50"
                      : "border-slate-700/70 bg-slate-900/70 text-slate-200 hover:border-emerald-300/70",
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={placementHints.has(code)}
                    onChange={() => togglePlacementHint(code)}
                  />
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px]">
                    {code.includes("subway")
                      ? "🚇"
                      : code.includes("bus")
                        ? "🚌"
                        : code.includes("mall")
                          ? "🛍️"
                          : "🌆"}
                  </span>
                  {tPlacement(code)}
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-50">
              <Target className="h-4 w-4 shrink-0" aria-hidden />
              {isKo ? "TKAD Bot이 타겟할 연령대" : tr("form.ageLabel")}
            </div>
            <div className="flex flex-wrap gap-2">
              {ageDef.map(({ code, label }) => (
                <label
                  key={code}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors sm:text-sm",
                    ageBands.has(code)
                      ? "border-gold/70 bg-gold/20 text-slate-950"
                      : "border-slate-700/70 bg-slate-900/70 text-slate-200 hover:border-gold/40",
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={ageBands.has(code)}
                    onChange={() => toggleAge(code)}
                  />
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px]">
                    {code === "teens"
                      ? "🔰"
                      : code === "twenties"
                        ? "✨"
                        : code === "thirties"
                          ? "💼"
                          : "👨‍👩‍👧"}
                  </span>
                  {label}
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-50">
              <Wallet className="h-4 w-4 shrink-0" aria-hidden />
              {isKo ? "TKAD Bot과 함께 정하는 예산 게이지" : tr("form.budgetLabel")}
            </div>
            <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3">
              <div className="flex items-center justify-between text-[11px] text-slate-300 sm:text-xs">
                <span className="tabular-nums">
                  {isKo
                    ? `${budgetMin.toLocaleString()}만원`
                    : `${budgetMin.toLocaleString()} (10K)`}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 font-semibold text-gold tabular-nums">
                  <Sparkles className="h-3 w-3" />
                  {isKo
                    ? `${budgetMan.toLocaleString()}만원`
                    : `${budgetMan.toLocaleString()} (10K)`}
                </span>
                <span className="tabular-nums">
                  {isKo
                    ? `${budgetMax.toLocaleString()}만원`
                    : `${budgetMax.toLocaleString()} (10K)`}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="range"
                    min={budgetMin}
                    max={budgetMax}
                    step={100}
                    value={budgetMan}
                    onChange={(e) => setBudgetMan(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-emerald-400"
                    aria-valuemin={budgetMin}
                    aria-valuemax={budgetMax}
                    aria-valuenow={budgetMan}
                  />
                  <div className="pointer-events-none absolute inset-y-0 flex items-center">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-emerald-400 via-gold to-amber-500 transition-all"
                      style={{
                        width: `${((budgetMan - budgetMin) / (budgetMax - budgetMin)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="hidden flex-col items-center text-[11px] text-slate-200 sm:flex">
                  <span className="mb-1 rounded-full bg-slate-800 px-2 py-0.5">
                    {isKo ? "TKAD Bot 분석" : "Maddy’s view"}
                  </span>
                  <span className="text-[10px] text-slate-300">
                    {isKo
                      ? "게이지를 움직여서 캠페인 스케일을 정해봐요."
                      : "Slide to set how bold your campaign should be."}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-50">
              <Building2 className="h-4 w-4 shrink-0" aria-hidden />
              {isKo
                ? "어떤 업종의 모험을 떠날까요?"
                : tr("form.industryLabel")}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {industryOptions.map((o) => {
                const selected = industry === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setIndustry(o.value)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs sm:text-sm",
                      selected
                        ? "border-gold/80 bg-gold/15 text-gold"
                        : "border-slate-700/70 bg-slate-900/70 text-slate-200 hover:border-gold/60",
                    )}
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[11px]">
                      {o.value === "beauty"
                        ? "💄"
                        : o.value === "retail"
                          ? "🛍️"
                          : o.value === "fmcg"
                            ? "🥤"
                            : o.value === "fintech"
                              ? "💳"
                              : o.value === "auto"
                                ? "🚗"
                                : o.value === "entertainment"
                                  ? "🎬"
                                  : "✨"}
                    </span>
                    <span className="font-semibold">{o.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-50">
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
              {tr("form.periodLabel")}
            </div>
            <div className="flex flex-wrap gap-2">
              {periodDef.map(({ w, label }) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setPeriodWeeks(w)}
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors sm:text-sm",
                    periodWeeks === w
                      ? "border-emerald-400/80 bg-emerald-400/15 text-emerald-50"
                      : "border-slate-700/70 bg-slate-900/70 text-slate-200 hover:border-emerald-300/70",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <div className="pt-2">
            <Button
              type="button"
              size="lg"
              disabled={!canSubmit}
              className={cn(
                "group relative flex h-14 w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-gold text-base font-bold text-slate-950 shadow-[0_0_40px_rgba(16,185,129,0.65)] ring-2 ring-emerald-300/60 transition-transform hover:scale-[1.02] hover:shadow-[0_0_55px_rgba(16,185,129,0.8)] disabled:opacity-50",
              )}
              onClick={handleSubmit}
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 transition-all duration-700 group-hover:translate-x-full group-hover:opacity-100" />
              <Sparkles className="mr-2 h-5 w-5" aria-hidden />
              {isKo ? "TKAD bot과 함께 탐험 시작! ✨" : tr("form.submit")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
