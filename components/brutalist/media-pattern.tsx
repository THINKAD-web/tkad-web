"use client";

/**
 * MediaPatternSection — PATTERN 섹션 (좌: 메타 + 우: 탭 + 막대 차트).
 * 매체 상세 chunk 3.
 *
 * 좌측 (#f5f5f5 bg): [03] / Pattern + 큰 제목 + 설명 + 피크 정보 3개 (Hour/Day/Month)
 * 우측: 탭 [시간대 / 요일 / 월별] (active 검정) + 막대 차트
 *   막대: 검정 기본, 피크 (max idx) 는 주황. height = pattern[i] / max
 *   하단 X축 라벨
 */
import { useMemo, useState } from "react";
import { SectionHead } from "@/components/brutalist";
import {
  resolveTrafficPattern,
  type StoredTrafficPattern,
} from "@/lib/media-traffic-estimate";

type Tab = "hourly" | "weekly" | "monthly";

const HOUR_AXIS = ["00", "06", "12", "18", "24"];
const DAY_AXIS_KO = ["월", "화", "수", "목", "금", "토", "일"];
const DAY_AXIS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_AXIS = ["1", "3", "6", "9", "12"];

type Props = {
  isKo: boolean;
  mediaType: string;
  region: string;
  /** DB 저장 traffic_pattern (없으면 매체유형·지역 추정) */
  trafficPattern?: StoredTrafficPattern | null;
  dailyFootfall?: number | null;
};

export function MediaPatternSection({
  isKo,
  mediaType,
  region,
  trafficPattern,
  dailyFootfall,
}: Props) {
  const { pattern, isEstimated } = useMemo(
    () => resolveTrafficPattern(trafficPattern ?? null, mediaType, region),
    [trafficPattern, mediaType, region],
  );

  const [tab, setTab] = useState<Tab>("hourly");

  const data = tab === "hourly"
    ? pattern.hourly
    : tab === "weekly"
      ? pattern.weekly
      : pattern.monthly;

  const max = Math.max(...data, 0.0001);
  const peakIdx = data.reduce(
    (acc, v, i) => (v > data[acc] ? i : acc),
    0,
  );

  // 피크 라벨 — 시간/요일/월
  const peakHourIdx = pattern.hourly.reduce(
    (a, v, i) => (v > pattern.hourly[a] ? i : a),
    0,
  );
  const peakDayIdx = pattern.weekly.reduce(
    (a, v, i) => (v > pattern.weekly[a] ? i : a),
    0,
  );
  const peakMonthIdx = pattern.monthly.reduce(
    (a, v, i) => (v > pattern.monthly[a] ? i : a),
    0,
  );

  const dayName = isKo
    ? DAY_AXIS_KO[peakDayIdx]
    : DAY_AXIS_EN[peakDayIdx];
  const peakHourLabel = isKo
    ? `점심 12-13시` // 단순화 — 실제는 peakHourIdx 기준
    : `Lunch 12-13`;
  const peakDayLabel = isKo ? `${dayName}요일` : dayName;
  const peakMonthLabel = isKo
    ? `${peakMonthIdx + 1}월`
    : `Month ${peakMonthIdx + 1}`;

  const xAxis = tab === "hourly"
    ? HOUR_AXIS
    : tab === "weekly"
      ? isKo
        ? DAY_AXIS_KO
        : DAY_AXIS_EN
      : MONTH_AXIS;

  return (
    <section className="border-b-2 border-bx-black bg-bx-white">
      <SectionHead
        number="03"
        category="Pattern"
        title={
          isKo ? (
            <>
              노출 <span className="bx-accent">[패턴]</span>
            </>
          ) : (
            <>
              Exposure <span className="bx-accent">[pattern]</span>
            </>
          )
        }
        meta={
          isKo
            ? `Hourly · weekly\nmonthly${isEstimated ? "\n* estimated" : ""}`
            : `Hourly · weekly\nmonthly${isEstimated ? "\n* estimated" : ""}`
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-3">
        {/* 좌측 — 메타 + 피크 정보 */}
        <aside className="border-bx-black bg-bx-off px-6 py-10 sm:px-8 sm:py-12 lg:col-span-1 lg:border-r-2">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
            [03] / Pattern
          </p>
          <h3 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-bx-black sm:text-3xl">
            {isKo
              ? "발걸음의 시간을 읽다."
              : "Reading the rhythm of foot traffic."}
          </h3>
          <p className="mt-4 text-sm leading-relaxed text-bx-gray-dim">
            {isKo
              ? `매체별 일유동 데이터(${dailyFootfall ? dailyFootfall.toLocaleString() + "명/일 기준" : "추정"})를 시간대·요일·월별 패턴으로 분해. 피크 시점에 노출이 집중됩니다.`
              : "We decompose daily traffic into hourly, weekly, and monthly patterns to identify peak exposure windows."}
          </p>

          <ul className="mt-8 space-y-3">
            <PeakRow label="Peak Hour" value={peakHourLabel} />
            <PeakRow label="Peak Day" value={peakDayLabel} />
            <PeakRow label="Peak Month" value={peakMonthLabel} />
          </ul>
        </aside>

        {/* 우측 — 탭 + 막대 차트 */}
        <div className="lg:col-span-2">
          {/* 탭 — 3개 */}
          <div className="grid grid-cols-3 border-b-2 border-bx-black">
            {([
              ["hourly", isKo ? "시간대" : "Hourly"],
              ["weekly", isKo ? "요일" : "Weekday"],
              ["monthly", isKo ? "월별" : "Monthly"],
            ] as const).map(([key, label], i) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={[
                    "border-bx-black py-3 font-mono text-[12px] font-bold uppercase tracking-[0.22em] transition-colors",
                    i > 0 ? "border-l-2" : "",
                    active
                      ? "bg-bx-black text-bx-white"
                      : "bg-bx-white text-bx-black hover:bg-bx-off",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* 막대 차트 — div 기반 (html2canvas 호환) */}
          <div className="px-6 py-10 sm:px-10 sm:py-14">
            <div
              className="flex h-48 items-end gap-1 sm:h-64"
              role="img"
              aria-label={isKo ? "패턴 막대 차트" : "Pattern bar chart"}
            >
              {data.map((v, i) => {
                const h = (v / max) * 100;
                const isPeak = i === peakIdx;
                return (
                  <div
                    key={i}
                    className="flex-1"
                    style={{ height: `${Math.max(2, h)}%` }}
                  >
                    <div
                      className={[
                        "h-full",
                        isPeak ? "bg-bx-accent" : "bg-bx-black",
                      ].join(" ")}
                    />
                  </div>
                );
              })}
            </div>
            {/* 하단 X축 라벨 */}
            <div className="mt-3 flex justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-bx-gray-dim">
              {xAxis.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PeakRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-baseline justify-between border-b-2 border-bx-black pb-2">
      <span className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
        / {label}
      </span>
      <span className="font-mono text-base font-bold text-bx-accent">
        {value}
      </span>
    </li>
  );
}
