#!/usr/bin/env npx tsx
/**
 * R-02 B그룹(미반영 13건) — 사람 확인용 백로그 생성. 읽기 전용, 가격 변경 없음.
 *
 * 목적: 이 13건은 대표 price/cpm 값 하나만 ×10 하면 끝나는 게 아니라, 매체별
 * 실제 요율표(priceOptions — 조명/영상, 20초/30초, 패키지 단위 등)를 보고
 * "어느 값을, 어떻게" 올릴지 사람이 판단해야 한다(코드가 대표값만 보고
 * 일괄 처리하면 다른 티어가 누락될 수 있음).
 *
 * reports/r02-price-x10-current-state-audit.json 의 groups.B 를
 * reports/dry-run-r02-price-x10.json 의 원본 행(priceOptions 등)과 조인해
 * 사람이 바로 검토할 수 있는 마크다운 목록을 만든다.
 *
 * Usage:
 *   npx tsx scripts/build-r02-manual-review-backlog.mts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

type AuditRow = {
  id: string;
  name: string;
  slug: string | null;
  preFixPrice: number;
  postFixPrice: number;
  currentPrice: number | null;
  currentCpm: number | null;
  updatedAt: string | null;
  reviewStatus: string | null;
};
type AuditReport = { groups: { B: AuditRow[] } };

type PriceOption = {
  label: string;
  price: number;
  period: string;
  description: string;
};
type DryRunRow = {
  id: string;
  slug: string | null;
  name: string;
  type: string;
  mediaClass: string;
  currentPrice: number;
  correctedPrice: number;
  pricePeriod: string;
  priceOptions: PriceOption[];
  currentCpm: number | null;
  correctedCpm: number | null;
};

function main() {
  const audit = JSON.parse(
    readFileSync(resolve(root, "reports/r02-price-x10-current-state-audit.json"), "utf8"),
  ) as AuditReport;
  const dryRun = JSON.parse(
    readFileSync(resolve(root, "reports/dry-run-r02-price-x10.json"), "utf8"),
  ) as { rows: DryRunRow[] };
  const dryRunById = new Map(dryRun.rows.map((r) => [r.id, r]));

  const B = audit.groups.B;
  if (B.length === 0) {
    console.log("B그룹이 비어 있습니다 — 백로그로 만들 대상이 없습니다.");
    return;
  }

  const lines: string[] = [];
  lines.push("# R-02 가격 정정 — 사람 확인 필요 목록 (B그룹)");
  lines.push("");
  lines.push(
    `생성 시각: ${new Date().toISOString()} · 대상: ${B.length}건 · ` +
      "가격은 변경되지 않음(읽기 전용 백로그).",
  );
  lines.push("");
  lines.push(
    "각 항목의 `priceOptions`는 dry-run 스캔 당시 원본 요율표입니다. " +
      "대표 price/cpm만 ×10 하지 말고, 실제 매체사 요율표를 대조해 " +
      "어떤 티어를 어떻게 올릴지 결정한 뒤 admin에서 직접 수정하세요.",
  );
  lines.push("");

  for (const [i, row] of B.entries()) {
    const dr = dryRunById.get(row.id);
    lines.push(`## ${i + 1}. ${row.name}`);
    lines.push("");
    lines.push(`- id: \`${row.id}\``);
    lines.push(`- slug: \`${row.slug ?? "-"}\``);
    lines.push(`- 현재 DB price: ${row.currentPrice?.toLocaleString() ?? "-"}원`);
    lines.push(`- 현재 DB cpm: ${row.currentCpm ?? "-"}`);
    lines.push(`- pre-fix(dry-run 기준): ${row.preFixPrice.toLocaleString()}원`);
    lines.push(`- post-fix 후보(dry-run 기준): ${row.postFixPrice.toLocaleString()}원`);
    lines.push(`- reviewStatus: ${row.reviewStatus ?? "-"}`);
    lines.push(`- updatedAt: ${row.updatedAt ?? "-"}`);
    if (dr) {
      lines.push(`- type/mediaClass: ${dr.type} / ${dr.mediaClass}`);
      lines.push(`- pricePeriod: ${dr.pricePeriod}`);
      if (dr.priceOptions.length > 0) {
        lines.push(`- priceOptions (원본 요율표, ${dr.priceOptions.length}개 티어):`);
        for (const opt of dr.priceOptions) {
          lines.push(
            `  - **${opt.label}**: ${opt.price.toLocaleString()}원 / ${opt.period} — ${opt.description}`,
          );
        }
      } else {
        lines.push("- priceOptions: (없음 — 대표 price/cpm만 존재)");
      }
    } else {
      lines.push("- ⚠️ dry-run 원본 행을 찾지 못함 (id 불일치 가능성 — 직접 확인 필요)");
    }
    lines.push("");
    lines.push("- [ ] 결정: ________________________");
    lines.push("");
  }

  const outPath = resolve(root, "reports/r02-manual-review-backlog.md");
  writeFileSync(outPath, lines.join("\n"));
  console.log(`백로그 작성 완료: ${outPath} (${B.length}건)`);
}

main();
