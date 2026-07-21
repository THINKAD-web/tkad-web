/**
 * Phase B — Audit list: cheapest option has non-canonical, non-safe-month-alias period.
 * READ-ONLY. No auto-mapping.
 *
 * Usage: node --import tsx scripts/.audit-price-period-risky-80.mjs
 * Writes: scripts/.audit-price-period-risky-80/{AUDIT.md,audit.csv,audit.json}
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isCanonicalMediaPricePeriod,
  isSafeMonthPeriodAlias,
} from "../lib/media-price-period-write.ts";
import {
  resolveMediaDisplayPrice,
  priceToMonthlyEquivalentWon,
  inferMediaPricePeriodFromPriceOption,
} from "../lib/media-price-format.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, ".audit-price-period-risky-80");
const BASE = process.env.AUDIT_BASE ?? "http://127.0.0.1:3000";

function classifyGuess(period, label, note, description) {
  const p = String(period ?? "");
  const blob = `${label ?? ""} ${note ?? ""} ${description ?? ""}`;
  const hints = [];
  if (/일\s*당|하루\s*단가|per\s*day|daily\s*rate/i.test(blob)) {
    hints.push("note/label suggests per-day rate");
  }
  if (/패키지|행사|1일권|일\s*단위\s*대여|lump|package/i.test(blob)) {
    hints.push("note/label suggests package/total");
  }
  if (/^1일$/.test(p)) {
    return {
      guess: "확인 필요 (일당 vs 1일 패키지 총액)",
      confidence: "low",
      hints,
      ifDayMonthly: null,
    };
  }
  if (/^2주$|^15일$/.test(p)) {
    return {
      guess: "패키지 총액 가능성 높음 → biweekly(×2) 후보 (수동 확인)",
      confidence: "medium",
      hints,
    };
  }
  if (/^\d+일$/.test(p)) {
    return {
      guess: "확인 필요 (N일 패키지 총액 vs 일당)",
      confidence: "low",
      hints,
    };
  }
  if (/^\d+주$|^4주$/.test(p)) {
    return {
      guess: "확인 필요 (주 단위 패키지 총액 vs week 단가)",
      confidence: "low",
      hints,
    };
  }
  if (/^\d+개월$/.test(p) && p !== "1개월") {
    return {
      guess: "다개월 총액 가능성 → month 단가 취급 시 과대 표시 위험",
      confidence: "medium",
      hints,
    };
  }
  return { guess: "확인 필요", confidence: "none", hints };
}

function csvEscape(s) {
  const t = String(s ?? "");
  if (/[",\n]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const res = await fetch(`${BASE}/api/public/media-catalog`);
  if (!res.ok) throw new Error(`catalog HTTP ${res.status}`);
  const data = await res.json();
  const catalog = Array.isArray(data) ? data : data.items ?? data.data ?? [];

  const rows = [];
  for (const m of catalog) {
    const opts = Array.isArray(m.priceOptions) ? m.priceOptions : [];
    let best = null;
    if (typeof m.price === "number" && m.price > 0) {
      best = {
        price: m.price,
        period: m.pricePeriod,
        source: "root",
        label: "(root price)",
      };
    }
    for (const o of opts) {
      if (!(typeof o.price === "number" && o.price > 0)) continue;
      if (!best || o.price < best.price) {
        best = {
          price: o.price,
          period: o.period ?? m.pricePeriod,
          source: "opt",
          label: o.label,
          description: o.description,
        };
      }
    }
    if (!best || best.source !== "opt") continue;
    const period = best.period;
    if (period == null || period === "") continue;
    if (isCanonicalMediaPricePeriod(period)) continue;
    if (isSafeMonthPeriodAlias(String(period))) continue;

    const display = resolveMediaDisplayPrice(m);
    const monthlyShown = priceToMonthlyEquivalentWon(
      display.priceWon,
      display.period,
    );
    const labelInfer = inferMediaPricePeriodFromPriceOption(
      { label: best.label, period: String(period) },
      m.pricePeriod,
    );
    const guess = classifyGuess(
      period,
      best.label,
      m.priceNote,
      `${m.description ?? ""} ${best.description ?? ""}`,
    );

    rows.push({
      id: m.id,
      name: m.name,
      cheapestPeriod: String(period),
      cheapestPrice: best.price,
      cheapestLabel: best.label ?? "",
      priceNote: m.priceNote ?? "",
      displayPeriod: display.period,
      displayPriceWon: display.priceWon,
      monthlyShown,
      labelInfer,
      guess: guess.guess,
      confidence: guess.confidence,
      hints: guess.hints.join("; "),
      priority: String(m.name).includes("명동 미디어폴") ? 0 : 1,
    });
  }

  rows.sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name, "ko"));

  const jsonPath = join(OUT, "audit.json");
  writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        catalogSize: catalog.length,
        count: rows.length,
        note: "Do NOT auto-map. Operator review required. Phase A only coerces 1개월/월/monthly.",
        rows,
      },
      null,
      2,
    ),
  );

  const csvHeader = [
    "priority",
    "name",
    "id",
    "cheapestPeriod",
    "cheapestPrice",
    "cheapestLabel",
    "priceNote",
    "displayPeriod",
    "displayPriceWon",
    "monthlyShown",
    "labelInfer",
    "guess",
    "confidence",
    "hints",
  ];
  const csvLines = [
    csvHeader.join(","),
    ...rows.map((r) =>
      csvHeader.map((h) => csvEscape(r[h])).join(","),
    ),
  ];
  writeFileSync(join(OUT, "audit.csv"), csvLines.join("\n"), "utf8");

  const md = [
    `# Phase B — 위험 period 감사 목록 (${rows.length}건)`,
    "",
    "자동 매핑 금지. Admin이 매체별로 period를 `day|week|biweekly|month`로 수동 정정.",
    "",
    `생성: ${new Date().toISOString()} · 카탈로그 ${catalog.length}건`,
    "",
    "## 우선 확인 (알려진 케이스)",
    "",
    ...rows
      .filter((r) => r.priority === 0)
      .map(
        (r) =>
          `- **${r.name}**: period=\`${r.cheapestPeriod}\` price=${r.cheapestPrice} → 표시 ${r.displayPriceWon} (${r.displayPeriod}) / 월환산 ${r.monthlyShown}. 추정: ${r.guess}`,
      ),
    "",
    "## 전체 목록",
    "",
    "| 매체 | period | 금액 | 라벨 | note | 표시가 | 월환산 | 라벨추론 | 추정 |",
    "|------|--------|------|------|------|--------|--------|----------|------|",
    ...rows.map(
      (r) =>
        `| ${r.name.replace(/\|/g, "/")} | \`${r.cheapestPeriod}\` | ${r.cheapestPrice} | ${String(r.cheapestLabel).replace(/\|/g, "/").slice(0, 40)} | ${String(r.priceNote).replace(/\|/g, "/").slice(0, 30)} | ${r.displayPriceWon}/${r.displayPeriod} | ${r.monthlyShown} | ${r.labelInfer} | ${r.guess} |`,
    ),
    "",
    `CSV: \`audit.csv\` · JSON: \`audit.json\``,
  ].join("\n");

  writeFileSync(join(OUT, "AUDIT.md"), md);
  console.log(
    JSON.stringify(
      {
        out: OUT,
        count: rows.length,
        myeongdong: rows.filter((r) => r.priority === 0).map((r) => r.name),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
