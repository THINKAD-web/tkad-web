/**
 * R-05 label-period mismatch — 재생빈도 라벨을 월간 상품 기준으로 재표기.
 * price / pricePeriod / priceOptions.price·period 등은 건드리지 않는다.
 */
import { parseLabelDays } from "./label-parse.ts";
import { periodToDays } from "./price.ts";

export { isFrequencyPlaybackLabel } from "./label-parse.ts";

export function normalizeFrequencyLabel(label: string): string {
  return label
    .replace(/(\d+)\s*일\s*(\d+)\s*회/g, "일 $2회/일")
    .replace(/^(\d+)\s*일\s+/u, "");
}

export function isTargetLabelPeriodMismatch(label: string, period: string): boolean {
  const labelDays = parseLabelDays(label);
  const periodDays = periodToDays(period);
  return labelDays === 1 && periodDays === 30;
}

/** fix (a) — audit parseLabelDays 가 30일로 읽히도록 재표기 */
export function proposeR05Relabel(label: string): string {
  const isFrequency = isFrequencyPlaybackLabel(label);
  if (isFrequency) {
    const body = normalizeFrequencyLabel(label);
    return body.startsWith("1개월") ? body : `1개월 · ${body}`;
  }
  if (parseLabelDays(label) === 30) return label;
  return `1개월 · ${label}`;
}

export type R05LabelPatch = {
  optionIdx: number;
  labelBefore: string;
  labelAfter: string;
};

/** priceOptions JSON — label 키만 변경, 다른 필드 byte-identical 유지 */
export function applyR05LabelPatchesOnly(
  priceOptions: unknown,
  patches: ReadonlyMap<number, string>,
): unknown {
  if (!Array.isArray(priceOptions)) {
    throw new Error("priceOptions must be an array");
  }
  return priceOptions.map((raw, idx) => {
    const afterLabel = patches.get(idx);
    if (afterLabel == null) return raw;
    if (!raw || typeof raw !== "object") {
      throw new Error(`priceOptions[${idx}] is not an object`);
    }
    const rec = raw as Record<string, unknown>;
    return { ...rec, label: afterLabel };
  });
}

/** 재표기 후에도 빈도·소재 길이 정보가 라벨에 남아 있는지 */
export function relabelPreservesContent(before: string, after: string): boolean {
  const sec = before.match(/(\d+)\s*초/);
  if (sec && !after.includes(sec[1]!)) return false;
  const plays = before.match(/(\d+)\s*회/);
  if (plays && !after.includes(plays[1]!)) return false;
  if (before.includes("1개월") && !after.includes("1개월")) return false;
  return after.includes("1개월") || after.includes("개월");
}
