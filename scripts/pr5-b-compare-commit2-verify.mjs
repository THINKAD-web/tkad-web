#!/usr/bin/env npx tsx
/**
 * PR5-b commit 2 — verify compare online budget billing unlock on Preview.
 * Usage: BASE=https://tkad-web-git-feat-pr5-b-gate-release-....vercel.app node scripts/pr5-b-compare-commit2-verify.mjs
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE = (process.env.BASE ?? "https://tkad.co.kr").replace(/\/$/, "");

async function main() {
  const res = await fetch(
    `${BASE}/api/public/media?catalogChannel=online&limit=25`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  const rows = data.data ?? data.items ?? data.medias ?? data;
  if (!Array.isArray(rows)) throw new Error("unexpected API shape");

  const calculable = rows.filter(
    (r) =>
      r.catalogChannel === "online" &&
      r.onlineSpec &&
      (r.onlineSpec.cpcMin != null || r.onlineSpec.cpmMin != null),
  );

  const slug = "google-ads-search";
  const sample = rows.find((r) => r.slug === slug);
  const compareRes = await fetch(`${BASE}/ko/compare?ids=${sample?.id ?? ""}`, {
    cache: "no-store",
  });
  const compareHtml = await compareRes.text();
  const hasInquiry = compareHtml.includes("가격 문의");
  const hasBudgetLabel = compareHtml.includes("월 예산");

  console.log("=== commit 2 compare unlock verify ===");
  console.log(`calculable online rows: ${calculable.length}`);
  console.log(`${slug} id: ${sample?.id ?? "MISSING"}`);
  console.log(`compare page has 월 예산 input: ${hasBudgetLabel}`);
  console.log(`compare page still has 가격 문의 (inquiry rows ok): ${hasInquiry}`);

  const pass =
    calculable.length >= 14 &&
    sample?.onlineSpec?.cpcMin != null &&
    hasBudgetLabel;

  console.log(pass ? "PASS compare unlock" : "FAIL compare unlock");
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
