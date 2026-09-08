#!/usr/bin/env npx tsx
/**
 * R-02 B그룹(13건) updatedAt 군집 진단 — 읽기 전용, DB/네트워크 불필요.
 *
 * scripts/audit-r02-price-x10-current-state.mts 의 출력
 * (reports/r02-price-x10-current-state-audit.json)을 읽어서:
 *   - A그룹(410건) updatedAt 분포
 *   - B그룹(13건) updatedAt 분포 + 인접 간격(초)
 * 를 비교해 아래 셋 중 하나로 판정한다.
 *
 *   - "A도 오늘 날짜 위주" → 최근 다른 배치(인기도 재계산 크론 등)가
 *     price 밖의 필드만 건드리며 updatedAt을 갱신한 것일 가능성이 큼
 *     (R-02 재실행 시도와 무관).
 *   - "A는 8월, B만 오늘 + 조밀한 간격(예: <60초)" → 오늘 R-02를
 *     재실행하려던 시도가 있었고 이 13건에서만 실패해 중간에 끊긴 흔적.
 *   - 그 외 → 패턴 불명확, 사람 판단 필요(원시 분포를 그대로 출력하니
 *     직접 확인할 것).
 *
 * Usage:
 *   npx tsx scripts/diagnose-r02-b-group-updatedat.mts
 *   npx tsx scripts/diagnose-r02-b-group-updatedat.mts --input=reports/r02-price-x10-current-state-audit.json
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

type Row = {
  id: string;
  name: string;
  slug: string | null;
  updatedAt: string | null;
};
type AuditReport = {
  groups: { A: Row[]; B: Row[]; C: Row[]; missing: Row[] };
};

function parseArgs() {
  const inputPath =
    process.argv.find((a) => a.startsWith("--input="))?.slice("--input=".length) ??
    "reports/r02-price-x10-current-state-audit.json";
  return { inputPath };
}

function dateOnly(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "null";
}

function distribution(rows: Row[]): Map<string, number> {
  const dist = new Map<string, number>();
  for (const r of rows) {
    const d = dateOnly(r.updatedAt);
    dist.set(d, (dist.get(d) ?? 0) + 1);
  }
  return dist;
}

function printDistribution(label: string, rows: Row[]) {
  const dist = distribution(rows);
  console.log(`\n${label} (${rows.length}건) updatedAt 날짜 분포:`);
  for (const [date, count] of [...dist.entries()].sort()) {
    console.log(`  ${date}: ${count}건`);
  }
}

function main() {
  const { inputPath } = parseArgs();
  const audit = JSON.parse(readFileSync(resolve(root, inputPath), "utf8")) as AuditReport;

  const { A, B } = audit.groups;
  if (B.length === 0) {
    console.log("B그룹이 비어 있습니다 — 진단할 대상이 없습니다.");
    return;
  }

  printDistribution("A그룹", A);
  printDistribution("B그룹", B);

  const bSorted = [...B]
    .filter((r) => r.updatedAt)
    .sort((a, b) => a.updatedAt!.localeCompare(b.updatedAt!));

  console.log(`\nB그룹(${bSorted.length}건) updatedAt 정렬 + 인접 간격:`);
  let prev: number | null = null;
  const gaps: number[] = [];
  for (const r of bSorted) {
    const t = new Date(r.updatedAt!).getTime();
    const gap = prev === null ? null : Math.round((t - prev) / 1000);
    if (gap !== null) gaps.push(gap);
    console.log(
      `  [${r.id}] ${r.name} — ${r.updatedAt}` +
        (gap === null ? "" : `  (+${gap}s)`),
    );
    prev = t;
  }

  const aDates = new Set([...distribution(A).keys()]);
  const bDates = new Set([...distribution(B).keys()]);
  const today = new Date().toISOString().slice(0, 10);

  const aMostlyToday =
    A.length > 0 &&
    (distribution(A).get(today) ?? 0) / A.length > 0.5;
  const bMostlyToday =
    B.length > 0 &&
    (distribution(B).get(today) ?? 0) / B.length > 0.5;
  const tightGaps = gaps.length > 0 && gaps.every((g) => g < 60);

  console.log("\n=== 판정 ===");
  if (aMostlyToday && bMostlyToday) {
    console.log(
      "A그룹도 오늘 날짜가 대부분 → B그룹만의 특이 패턴이 아니라, " +
        "최근 다른 배치(예: 인기도 재계산 크론)가 두 그룹 모두의 updatedAt을 " +
        "건드렸을 가능성이 큽니다. R-02 재실행 시도와는 무관해 보입니다.",
    );
  } else if (!aMostlyToday && bMostlyToday && tightGaps) {
    console.log(
      "A그룹은 과거 날짜 위주, B그룹만 오늘 날짜 + 인접 간격 60초 미만으로 조밀 " +
        "→ 오늘 R-02를 재실행하려던 시도가 있었고, 이 13건 구간에서 중간에 " +
        "끊겼을 가능성이 높습니다(배치 실행 중 예외/타임아웃/수동 중단 등).",
    );
  } else if (!aMostlyToday && bMostlyToday) {
    console.log(
      "A그룹은 과거 날짜 위주, B그룹만 오늘 날짜 — 이지만 인접 간격이 조밀하지 " +
        "않습니다. 재실행 흔적일 수도, 개별적으로 손을 댄 것일 수도 있습니다. " +
        "위 원시 목록을 직접 확인해 주세요.",
    );
  } else {
    console.log(
      "위 두 패턴에 명확히 들어맞지 않습니다. A/B 날짜 분포와 B그룹 간격을 " +
        "직접 눈으로 확인해 주세요(원시 데이터는 위에 모두 출력되어 있습니다).",
    );
  }

  console.log(`\n(참고) A그룹 날짜 종류: ${[...aDates].sort().join(", ")}`);
  console.log(`(참고) B그룹 날짜 종류: ${[...bDates].sort().join(", ")}`);
}

main();
