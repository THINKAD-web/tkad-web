"use client";

/**
 * PR-6a Step 1 · 브리프 입력.
 *
 * 자연어 입력과 직접 입력이 같은 상태(useBriefStore)로 수렴한다.
 * 필수는 예산·기간 2개뿐 — 나머지 미입력 시 "전국·전 타깃 기준" 명시.
 *
 * 데이터 정확도·매체 필터·지표 계산은 이번 범위 아님(6b). 이 컴포넌트는
 * 브리프를 수집하고 Step 2 로 넘길 준비만 한다.
 */

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import type { MediaItem } from "@/lib/media-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useBriefStore } from "@/lib/planner/brief/store";
import {
  SIDO_REGIONS,
  summarizeSidoCodes,
  type SidoCode,
} from "@/lib/planner/brief/regions";
import {
  BRIEF_AGE_BANDS,
  BRIEF_ENTRY_MODES,
  BRIEF_GENDERS,
  BRIEF_GOALS,
  BRIEF_INDUSTRIES,
  briefQuickRequiredStatus,
  briefRequiredStatus,
  briefUsesDefaults,
  flightDays,
  totalBudgetWon,
  type BriefAgeBand,
  type BriefEntryMode,
  type BriefGoal,
  type BriefIndustry,
} from "@/lib/planner/brief/types";
import { presetToBrief, presetToQuickBrief } from "@/lib/planner/brief/presets";
import { BriefPresetPicker } from "@/components/planner/brief/brief-preset-picker";
import type { CampaignPlanGender } from "@/lib/campaign-plan-schema";
import {
  BRIEF_CHANNEL_MODES,
  type BriefChannelMode,
} from "@/lib/planner/brief/brief-integrated-adapters";
import { BriefQuickRankPanel } from "@/components/planner/brief/brief-quick-rank";
import { countMixUnits } from "@/lib/planner/brief/brief-fingerprint";

const GOAL_LABELS: Record<BriefGoal, { ko: string; en: string }> = {
  awareness: { ko: "인지", en: "Awareness" },
  consideration: { ko: "고려", en: "Consideration" },
  conversion: { ko: "전환", en: "Conversion" },
};

const INDUSTRY_LABELS: Record<BriefIndustry, { ko: string; en: string }> = {
  fb: { ko: "F&B", en: "F&B" },
  retail: { ko: "유통·리테일", en: "Retail" },
  tech: { ko: "IT·테크", en: "Tech" },
  finance: { ko: "금융", en: "Finance" },
  ent: { ko: "엔터·미디어", en: "Entertainment" },
  other: { ko: "기타", en: "Other" },
};

const GENDER_LABELS: Record<CampaignPlanGender, { ko: string; en: string }> = {
  female: { ko: "여성", en: "Female" },
  male: { ko: "남성", en: "Male" },
};

const AGE_LABELS: Record<BriefAgeBand, string> = {
  "10s": "10s",
  "20s": "20s",
  "30s": "30s",
  "40s": "40s",
  "50s+": "50+",
};

const CHANNEL_MODE_LABELS: Record<
  BriefChannelMode,
  { ko: string; en: string; hint: { ko: string; en: string } }
> = {
  ooh_only: {
    ko: "OOH만",
    en: "OOH only",
    hint: {
      ko: "옥외 매체만 집행합니다.",
      en: "Outdoor media only.",
    },
  },
  ooh_digital: {
    ko: "OOH + 디지털",
    en: "OOH + Digital",
    hint: {
      ko: "Step 2에서 디지털 채널 배분을 함께 설계합니다.",
      en: "Step 2 includes digital channel allocation.",
    },
  },
};

const ENTRY_MODE_LABELS: Record<
  BriefEntryMode,
  { ko: string; en: string; desc: { ko: string; en: string } }
> = {
  quick: {
    ko: "빠른 추천",
    en: "Quick recommend",
    desc: {
      ko: "예산·지역만으로 매체 순위를 바로 확인합니다.",
      en: "See media rankings with budget and region only.",
    },
  },
  detailed: {
    ko: "자세히 설계",
    en: "Detailed plan",
    desc: {
      ko: "기간·타깃·목표까지 입력해 믹스를 설계합니다.",
      en: "Add flight, target, and goals to design a mix.",
    },
  },
};

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:border-primary/50"
      }`}
    >
      {children}
    </button>
  );
}

function SectionLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="mb-2 flex items-center gap-1.5 tkad-type-title">
      {children}
      {required ? (
        <span className="text-destructive" aria-hidden>
          *
        </span>
      ) : null}
    </div>
  );
}

export function BriefStepOne({
  catalog = [],
  onRequestNext,
  onNext,
}: {
  catalog?: readonly MediaItem[];
  /** L-1: 부모가 Step 2 이동 전 브리프·믹스 확인 */
  onRequestNext?: () => void;
  onNext?: () => void;
}) {
  const locale = useLocale();
  const isKo = locale === "ko";

  const store = useBriefStore();
  const [freeTextDraft, setFreeTextDraft] = useState(store.freeText);
  const isQuick = store.entryMode === "quick";

  const required = briefRequiredStatus(store);
  const quickRequired = briefQuickRequiredStatus(store);
  const mixCount = countMixUnits(store.mixUnits);
  const defaults = briefUsesDefaults(store);
  const days = flightDays(store);
  const totalWon = totalBudgetWon(store);

  const budgetManInput = useMemo(
    () => (store.budgetInputWon > 0 ? Math.round(store.budgetInputWon / 10_000) : ""),
    [store.budgetInputWon],
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      {/* ── O-2 진입 모드 ── */}
      <section>
        <SectionLabel>{isKo ? "시작 방식" : "How to start"}</SectionLabel>
        <div className="inline-flex overflow-hidden rounded-lg border border-border">
          {BRIEF_ENTRY_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => store.setEntryMode(mode)}
              className={`px-4 py-2 text-sm font-medium ${
                store.entryMode === mode
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              }`}
              data-entry-mode={mode}
            >
              {ENTRY_MODE_LABELS[mode][isKo ? "ko" : "en"]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {ENTRY_MODE_LABELS[store.entryMode].desc[isKo ? "ko" : "en"]}
        </p>
      </section>

      <hr className="border-border" />

      {isQuick ? (
        <>
          {/* ── 빠른 추천: 예산 ── */}
          <section>
            <SectionLabel required>
              {isKo ? "예산" : "Budget"}
            </SectionLabel>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <Input
                  inputMode="numeric"
                  value={budgetManInput}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(/[^0-9]/g, ""));
                    store.setBudgetInputWon(Number.isFinite(n) ? n * 10_000 : 0);
                  }}
                  placeholder="3000"
                  className="w-32 text-right"
                />
                <span className="text-sm text-muted-foreground">
                  {isKo ? "만원" : "0k KRW"}
                </span>
              </div>
            </div>
            <div className="mt-3">
              <BriefPresetPicker
                isKo={isKo}
                label={isKo ? "또는 프리셋으로 시작:" : "or start from a preset:"}
                onSelect={(p) => store.applyBriefPreset(presetToQuickBrief(p))}
              />
            </div>
          </section>

          {/* ── 빠른 추천: 지역 ── */}
          <section>
            <SectionLabel>{isKo ? "지역" : "Regions"}</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {SIDO_REGIONS.map((r) => (
                <Chip
                  key={r.code}
                  active={store.regionCodes.includes(r.code)}
                  onClick={() => store.toggleRegion(r.code as SidoCode)}
                >
                  {isKo ? r.ko : r.en}
                </Chip>
              ))}
            </div>
            {defaults.allRegions ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {isKo
                  ? "미선택 — 전국 기준으로 진행합니다."
                  : "None selected — proceeding nationwide."}
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                {summarizeSidoCodes(store.regionCodes, isKo, 4)}
              </p>
            )}
          </section>

          <section>
            <SectionLabel>{isKo ? "추천 순위" : "Rankings"}</SectionLabel>
            <BriefQuickRankPanel catalog={catalog} isKo={isKo} />
          </section>

          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-medium">
              {isKo
                ? "예산·기간을 더 넣어 정확도를 높이려면"
                : "For better accuracy, add budget and flight details"}
            </p>
            <Button
              type="button"
              variant="link"
              className="mt-1 h-auto p-0 text-sm"
              onClick={() => store.setEntryMode("detailed")}
            >
              {isKo ? "→ 자세히 설계로 전환" : "→ Switch to detailed planning"}
            </Button>
          </div>

          {/* ── 진행 (빠른 추천) ── */}
          <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-border bg-background/95 py-4 backdrop-blur">
            <div className="text-xs text-muted-foreground">
              {!quickRequired.ok ? (
                <span className="text-destructive">
                  {isKo
                    ? "예산을 입력해 주세요 (필수)"
                    : "Budget is required"}
                </span>
              ) : mixCount > 0 ? (
                <span>
                  {isKo
                    ? `${mixCount}개 매체 담김 · 다음 단계에서 수량을 조정합니다`
                    : `${mixCount} media added · adjust quantities next`}
                </span>
              ) : (
                <span>
                  {isKo
                    ? "지금 담지 않아도 됩니다 — 믹스 편집에서 추천을 다시 봅니다"
                    : "You can also add media in the next step"}
                </span>
              )}
            </div>
            <Button
              type="button"
              disabled={!quickRequired.ok}
              onClick={() => {
                if (onRequestNext) onRequestNext();
                else store.setWizardStep(2);
                onNext?.();
              }}
            >
              {isKo ? "다음 · 믹스 편집" : "Next · Edit mix"}
            </Button>
          </div>
        </>
      ) : (
        <>
      {/* ── 자연어 입력 ── */}
      <section>
        <SectionLabel>
          {isKo ? "한 줄로 설명해 보세요" : "Describe in one line"}
        </SectionLabel>
        <p className="mb-2 text-xs text-muted-foreground">
          {isKo
            ? "예: 3천만원 서울경기 2030 여성 2주"
            : "e.g. ₩30M Seoul Gyeonggi women in their 20s-30s for 2 weeks"}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Textarea
            value={freeTextDraft}
            onChange={(e) => setFreeTextDraft(e.target.value)}
            rows={2}
            placeholder={
              isKo
                ? "캠페인을 자유롭게 적어주세요"
                : "Write your campaign freely"
            }
            className="flex-1"
          />
          <Button
            type="button"
            onClick={() => store.applyFreeText(freeTextDraft)}
            disabled={freeTextDraft.trim().length === 0}
          >
            {isKo ? "채우기" : "Fill"}
          </Button>
        </div>

        {/* 업종 프리셋 — 풀에서 3개 shuffle 노출 (G-4: 무작위 값 채우기 아님) */}
        <div className="mt-3">
          <BriefPresetPicker
            isKo={isKo}
            onSelect={(p) => {
              store.applyBriefPreset(presetToBrief(p));
              setFreeTextDraft("");
            }}
          />
        </div>
      </section>

      <hr className="border-border" />

      {/* ── 채널 (O-1) ── */}
      <section>
        <SectionLabel>{isKo ? "채널" : "Channels"}</SectionLabel>
        <p className="mb-2 text-xs text-muted-foreground">
          {isKo
            ? "THINKAD는 OOH를 중심으로 하며, 필요하실 때 온라인 채널을 함께 구성할 수 있습니다."
            : "THINKAD centers on OOH, with online channels available whenever you need them."}
        </p>
        <div className="inline-flex overflow-hidden rounded-lg border border-border">
          {BRIEF_CHANNEL_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => store.setChannelMode(mode)}
              className={`px-4 py-2 text-sm font-medium ${
                store.channelMode === mode
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              }`}
              data-channel-mode={mode}
            >
              {CHANNEL_MODE_LABELS[mode][isKo ? "ko" : "en"]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {CHANNEL_MODE_LABELS[store.channelMode].hint[isKo ? "ko" : "en"]}
        </p>
      </section>

      <hr className="border-border" />

      {/* ── 예산 (필수) ── */}
      <section>
        <SectionLabel required>
          {isKo ? "예산" : "Budget"}
        </SectionLabel>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Input
              inputMode="numeric"
              value={budgetManInput}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/[^0-9]/g, ""));
                store.setBudgetInputWon(Number.isFinite(n) ? n * 10_000 : 0);
              }}
              placeholder="3000"
              className="w-32 text-right"
            />
            <span className="text-sm text-muted-foreground">
              {isKo ? "만원" : "0k KRW"}
            </span>
          </div>
          <div className="inline-flex overflow-hidden rounded-lg border border-border">
            {(["total", "monthly"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => store.setBudgetMode(mode)}
                className={`px-3 py-1.5 text-sm ${
                  store.budgetMode === mode
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground"
                }`}
              >
                {mode === "total"
                  ? isKo
                    ? "총액"
                    : "Total"
                  : isKo
                    ? "월예산"
                    : "Monthly"}
              </button>
            ))}
          </div>
        </div>
        {store.budgetMode === "monthly" && days != null ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {isKo
              ? `총 예산 환산 ≈ ${(totalWon / 10_000).toLocaleString()}만원 (${days}일 기준)`
              : `Total ≈ ₩${totalWon.toLocaleString()} (${days} days)`}
          </p>
        ) : null}
      </section>

      {/* ── 기간 (필수) ── */}
      <section>
        <SectionLabel required>
          {isKo ? "기간" : "Flight"}
        </SectionLabel>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={store.flightStart ?? ""}
            onChange={(e) =>
              store.setFlight(e.target.value || null, store.flightEnd)
            }
            className="w-44"
          />
          <span className="text-muted-foreground">~</span>
          <Input
            type="date"
            value={store.flightEnd ?? ""}
            onChange={(e) =>
              store.setFlight(store.flightStart, e.target.value || null)
            }
            className="w-44"
          />
          {days != null ? (
            <Badge variant="secondary">
              {isKo ? `${days}일` : `${days} days`}
            </Badge>
          ) : null}
        </div>
      </section>

      <hr className="border-border" />

      {/* ── 지역 (17 시도) ── */}
      <section>
        <SectionLabel>{isKo ? "지역" : "Regions"}</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {SIDO_REGIONS.map((r) => (
            <Chip
              key={r.code}
              active={store.regionCodes.includes(r.code)}
              onClick={() => store.toggleRegion(r.code as SidoCode)}
            >
              {isKo ? r.ko : r.en}
            </Chip>
          ))}
        </div>
        {defaults.allRegions ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {isKo
              ? "미선택 — 전국 기준으로 진행합니다."
              : "None selected — proceeding nationwide."}
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            {summarizeSidoCodes(store.regionCodes, isKo, 4)}
          </p>
        )}
      </section>

      {/* ── 타깃 (성별 + 연령) ── */}
      <section>
        <SectionLabel>{isKo ? "타깃" : "Target"}</SectionLabel>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {isKo ? "성별" : "Gender"}
            </span>
            {BRIEF_GENDERS.map((g) => (
              <Chip
                key={g}
                active={store.genders.includes(g)}
                onClick={() => store.toggleGender(g)}
              >
                {GENDER_LABELS[g][isKo ? "ko" : "en"]}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {isKo ? "연령" : "Age"}
            </span>
            {BRIEF_AGE_BANDS.map((a) => (
              <Chip
                key={a}
                active={store.ageBands.includes(a)}
                onClick={() => store.toggleAgeBand(a)}
              >
                {AGE_LABELS[a]}
              </Chip>
            ))}
          </div>
        </div>
        {defaults.allGenders && defaults.allAges ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {isKo
              ? "미선택 — 전 타깃 기준으로 진행합니다."
              : "None selected — proceeding for all audiences."}
          </p>
        ) : null}
      </section>

      <hr className="border-border" />

      {/* ── 목표 ── */}
      <section>
        <SectionLabel>{isKo ? "목표" : "Goal"}</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {BRIEF_GOALS.map((g) => (
            <Chip
              key={g}
              active={store.goal === g}
              onClick={() => store.setGoal(store.goal === g ? null : g)}
            >
              {GOAL_LABELS[g][isKo ? "ko" : "en"]}
            </Chip>
          ))}
        </div>
      </section>

      {/* ── 업종 ── */}
      <section>
        <SectionLabel>{isKo ? "업종" : "Industry"}</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {BRIEF_INDUSTRIES.map((ind) => (
            <Chip
              key={ind}
              active={store.industry === ind}
              onClick={() =>
                store.setIndustry(store.industry === ind ? null : ind)
              }
            >
              {INDUSTRY_LABELS[ind][isKo ? "ko" : "en"]}
            </Chip>
          ))}
        </div>
      </section>

      {/* ── 진행 ── */}
      <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-border bg-background/95 py-4 backdrop-blur">
        <div className="text-xs text-muted-foreground">
          {required.ok ? (
            <span>
              {isKo
                ? `예산·기간 확인됨${defaults.any ? " · 나머지는 기본값" : ""}`
                : `Budget & flight set${defaults.any ? " · rest default" : ""}`}
            </span>
          ) : (
            <span className="text-destructive">
              {isKo
                ? "예산과 기간을 입력해 주세요 (필수)"
                : "Budget and flight are required"}
            </span>
          )}
        </div>
        <Button
          type="button"
          disabled={!required.ok}
          onClick={() => {
            if (onRequestNext) onRequestNext();
            else store.setWizardStep(2);
            onNext?.();
          }}
        >
          {isKo ? "다음 · 믹스 편집" : "Next · Edit mix"}
        </Button>
      </div>
        </>
      )}
    </div>
  );
}
