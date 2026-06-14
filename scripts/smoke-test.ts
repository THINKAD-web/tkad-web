/**
 * 자동 기능 점검 스모크 테스트 (수동/CI 실행).
 *
 *   npm run smoke -- --base=https://app.tkad.co.kr
 *   npm run smoke -- --base=http://localhost:3000 --browser   # 모바일 넘침 + E2E 포함
 *
 * 1) 페이지 생존 + API 헬스 (HTTP, 기본)
 * 2) 모바일 375px 가로 넘침 (--browser)
 * 3) 핵심 플로우 E2E (--browser)
 * 4) 한 장 리포트 + 실패 시 exit 1
 */
import { config } from "dotenv";
import { runHealthChecks } from "@/lib/health-check";
import {
  HEALTH_MOBILE_ROUTES,
  type HealthCheckRow,
} from "@/lib/health-check-routes";

config({ path: ".env.local" });

const base =
  process.argv.find((a) => a.startsWith("--base="))?.slice(7) ??
  process.env.SMOKE_BASE_URL ??
  process.env.HEALTH_CHECK_BASE_URL ??
  "https://app.tkad.co.kr";
const useBrowser = process.argv.includes("--browser");

const C = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

type Extra = { name: string; ok: boolean; issue?: string };

async function browserChecks(): Promise<Extra[]> {
  const out: Extra[] = [];
  let chromium: typeof import("playwright").chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    out.push({ name: "playwright 미설치 — --browser 검사 생략", ok: false });
    return out;
  }
  const browser = await chromium.launch({
    ...(process.env.PW_CHROMIUM_PATH
      ? { executablePath: process.env.PW_CHROMIUM_PATH }
      : {}),
  });

  // ── 2) 모바일 375px 가로 넘침 ──
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  for (const route of HEALTH_MOBILE_ROUTES) {
    try {
      await page.goto(`${base}${route}`, {
        waitUntil: "networkidle",
        timeout: 30_000,
      });
      const offenders = await page.evaluate(() => {
        const cw = document.documentElement.clientWidth;
        const bad: { tag: string; cls: string; width: number }[] = [];
        document.querySelectorAll<HTMLElement>("*").forEach((el) => {
          if (el.scrollWidth > cw + 5) {
            bad.push({
              tag: el.tagName,
              cls: String(el.className ?? "").slice(0, 80),
              width: el.scrollWidth,
            });
          }
        });
        return bad.slice(0, 5);
      });
      out.push({
        name: `📱 ${route}`,
        ok: offenders.length === 0,
        issue:
          offenders.length === 0
            ? undefined
            : offenders
                .map((o) => `${o.tag}.${o.cls.split(" ")[0]} (${o.width}px)`)
                .join(", "),
      });
    } catch (e) {
      out.push({ name: `📱 ${route}`, ok: false, issue: e instanceof Error ? e.message : String(e) });
    }
  }

  // ── 3) 핵심 플로우 E2E ──
  // (1) 매체 검색 → 결과 카드 존재
  try {
    await page.goto(`${base}/ko/media`, { waitUntil: "networkidle", timeout: 30_000 });
    const cards = await page.locator("a[href*='/media/']").count();
    out.push({ name: "E2E 매체 검색 결과", ok: cards > 0, issue: cards > 0 ? undefined : "결과 카드 없음" });
  } catch (e) {
    out.push({ name: "E2E 매체 검색 결과", ok: false, issue: e instanceof Error ? e.message : String(e) });
  }

  // (2) 챗봇 엔드포인트 응답 (점검중이면 점검 메시지도 정상으로 간주)
  try {
    const res = await fetch(`${base}/api/chat`, { method: "GET" });
    out.push({ name: "E2E 챗봇 엔드포인트", ok: res.status < 500, issue: res.status < 500 ? undefined : `HTTP ${res.status}` });
  } catch (e) {
    out.push({ name: "E2E 챗봇 엔드포인트", ok: false, issue: e instanceof Error ? e.message : String(e) });
  }

  // (3) 문의 폼 검증 응답 (잘못된 이메일 → 4xx, 실데이터 미생성)
  try {
    const res = await fetch(`${base}/api/contact`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale: "ko", name: "smoke", email: "bad", message: "x" }),
    });
    out.push({ name: "E2E 문의 폼 검증", ok: res.status >= 400 && res.status < 500, issue: undefined });
  } catch (e) {
    out.push({ name: "E2E 문의 폼 검증", ok: false, issue: e instanceof Error ? e.message : String(e) });
  }

  await browser.close();
  return out;
}

function printRow(label: string, ok: boolean, status: string, issue?: string) {
  const mark = ok ? C.green("✅") : C.red("❌");
  const st = ok ? C.dim(status) : C.red(status);
  console.log(`${mark} ${label.padEnd(42)} ${st}${issue ? "  " + C.red(issue) : ""}`);
}

async function main() {
  console.log(C.bold(`\n🔍 스모크 테스트 — ${base}\n`));

  const http = await runHealthChecks(base);

  console.log(C.bold("── 페이지 / API ──"));
  for (const r of http.rows as HealthCheckRow[]) {
    printRow(r.url, r.ok, `HTTP ${r.status} ${r.ms}ms`, r.issue);
  }

  let extra: Extra[] = [];
  if (useBrowser) {
    console.log(C.bold("\n── 모바일 넘침 / E2E (--browser) ──"));
    extra = await browserChecks();
    for (const e of extra) printRow(e.name, e.ok, e.ok ? "OK" : "FAIL", e.issue);
  } else {
    console.log(C.dim("\n(--browser 미지정 — 모바일 넘침/E2E 생략)"));
  }

  const totalPass = http.pass + extra.filter((e) => e.ok).length;
  const totalFail = http.fail + extra.filter((e) => !e.ok).length;
  const total = totalPass + totalFail;

  console.log(C.bold("\n━━━━━━━━━━━━━━━━━━━━━━━━"));
  console.log(`  ${C.green(`✅ 정상: ${totalPass}개`)}   ${totalFail > 0 ? C.red(`❌ 실패: ${totalFail}개`) : C.dim("❌ 실패: 0개")}   (전체 ${total})`);
  console.log(C.bold("━━━━━━━━━━━━━━━━━━━━━━━━"));

  if (totalFail > 0) {
    console.log(C.red("\n실패 목록:"));
    for (const r of http.rows.filter((x) => !x.ok)) {
      console.log(C.red(`  - ${r.url} → ${r.issue ?? `HTTP ${r.status}`}`));
    }
    for (const e of extra.filter((x) => !x.ok)) {
      console.log(C.red(`  - ${e.name} → ${e.issue ?? "FAIL"}`));
    }
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("smoke-test crashed:", e);
  process.exit(1);
});
