#!/usr/bin/env npx tsx
/**
 * PR5-b wizard commit 1 — online visible in Step 1, not selectable; deeplink no pre-select.
 * Usage: BASE=https://tkad-web-git-feat-pr5-b-gate-release-....vercel.app node scripts/pr5-b-wizard-commit1-verify.mjs
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE = (process.env.BASE ?? "https://tkad.co.kr").replace(/\/$/, "");

async function main() {
  const apiRes = await fetch(
    `${BASE}/api/public/media?catalogChannel=online&limit=25`,
    { cache: "no-store" },
  );
  if (!apiRes.ok) throw new Error(`API ${apiRes.status}`);
  const apiData = await apiRes.json();
  const onlineRows = apiData.data ?? [];
  const calculable = onlineRows.filter(
    (r) =>
      r.onlineSpec &&
      (r.onlineSpec.cpcMin != null || r.onlineSpec.cpmMin != null),
  );
  const inquiry = onlineRows.filter(
    (r) =>
      !r.onlineSpec ||
      (r.onlineSpec.cpcMin == null && r.onlineSpec.cpmMin == null),
  );
  const calcSlug = "google-ads-search";
  const inqSlug = "native-taboola-traffic";
  const calc = onlineRows.find((r) => r.slug === calcSlug);
  const inq = onlineRows.find((r) => r.slug === inqSlug);

  const quoteHtml = await fetch(`${BASE}/ko/quote`, { cache: "no-store" }).then(
    (r) => r.text(),
  );
  const deeplinkHtml = calc?.id
    ? await fetch(`${BASE}/ko/quote?media=${calc.id}`, {
        cache: "no-store",
      }).then((r) => r.text())
    : "";

  const quoteHasCalcName =
    calc?.name != null && quoteHtml.includes(calc.name.slice(0, 8));
  const quoteHasInqName =
    inq?.name != null && quoteHtml.includes(inq.name.slice(0, 6));
  const hasBlockedCalcCopy = quoteHtml.includes("월 예산") || quoteHtml.includes("곧 지원");
  const hasBlockedInqCopy = quoteHtml.includes("가격 문의");

  // Deeplink: calculable online ID should NOT appear selected in floating bar / step 2 stash
  const deeplinkPreselectHint =
    deeplinkHtml.includes("selectedIds") ||
    (calc?.name && deeplinkHtml.split(calc.name).length > 2);

  console.log("=== wizard commit 1 verify ===");
  console.log(`online API rows: ${onlineRows.length} (calculable ${calculable.length}, inquiry ${inquiry.length})`);
  console.log(`quote page shows calculable name (${calcSlug}): ${quoteHasCalcName}`);
  console.log(`quote page shows inquiry name (${inqSlug}): ${quoteHasInqName}`);
  console.log(`blocked copy hints (월 예산/곧 지원): ${hasBlockedCalcCopy}`);
  console.log(`inquiry label on page: ${hasBlockedInqCopy}`);
  console.log(
    `deeplink ?media= calculable — no duplicate name selection hint: ${!deeplinkPreselectHint}`,
  );

  const pass =
    onlineRows.length >= 23 &&
    calculable.length >= 14 &&
    inquiry.length >= 9 &&
    quoteHasCalcName &&
    quoteHasInqName &&
    !deeplinkPreselectHint;

  console.log(pass ? "PASS wizard commit 1" : "FAIL wizard commit 1");
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
