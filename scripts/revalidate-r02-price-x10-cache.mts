#!/usr/bin/env npx tsx
/**
 * R-02 price ×10 — 캐시 정리 (DB 접근 불필요, HTTP만).
 *
 * scripts/audit-r02-price-x10-current-state.mts 의 출력
 * (reports/r02-price-x10-current-state-audit.json)을 읽어 그룹별로
 * revalidateMediaCachesAfterScript()를 호출한다. price는 list(카드 표시)와
 * detail(상세 페이지) 양쪽에 다 노출되므로 bulk(list+detail) 헬퍼를 쓴다.
 *
 * 기본: A그룹(정상 반영 확인된 건)만 무효화 — DB는 맞는데 캐시가 예전 값을
 * 들고 있을 수 있는 건들. B/C그룹은 DB 값 자체가 아직 틀렸거나 불확실하므로
 * 기본적으로 건드리지 않는다(잘못된 값을 "확정"시키는 캐시 재생성을 피함).
 *
 * Usage:
 *   npx tsx scripts/revalidate-r02-price-x10-cache.mts            # A그룹만
 *   npx tsx scripts/revalidate-r02-price-x10-cache.mts --all      # B/C 그룹 DB 수정 완료 후, 423건 전부
 *   npx tsx scripts/revalidate-r02-price-x10-cache.mts --group=B  # B그룹만(수동 확인용)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { revalidateMediaCachesAfterScript } from "./lib/revalidate-media-list-after-script";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env.local") });
config({ path: resolve(root, ".env.vercel.production"), override: false });

type AuditRow = { id: string; slug: string | null; name: string };
type AuditReport = {
  groups: { A: AuditRow[]; B: AuditRow[]; C: AuditRow[]; missing: AuditRow[] };
};

function parseArgs() {
  const all = process.argv.includes("--all");
  const groupArg = process.argv.find((a) => a.startsWith("--group="));
  const group = groupArg?.slice("--group=".length) as "A" | "B" | "C" | undefined;
  const inputPath =
    process.argv.find((a) => a.startsWith("--input="))?.slice("--input=".length) ??
    "reports/r02-price-x10-current-state-audit.json";
  return { all, group, inputPath };
}

async function main() {
  const { all, group, inputPath } = parseArgs();
  const audit = JSON.parse(readFileSync(resolve(root, inputPath), "utf8")) as AuditReport;

  let refs: AuditRow[];
  let label: string;
  if (group) {
    refs = audit.groups[group];
    label = `group ${group}`;
  } else if (all) {
    refs = [...audit.groups.A, ...audit.groups.B, ...audit.groups.C];
    label = "all groups (A+B+C)";
  } else {
    refs = audit.groups.A;
    label = "group A (post-fix confirmed) only";
  }

  if (refs.length === 0) {
    console.log(`No refs to revalidate (${label} is empty).`);
    return;
  }

  console.log(`Revalidating ${refs.length} media (${label})...`);
  for (const r of refs.slice(0, 10)) {
    console.log(`  [${r.id}] ${r.name}`);
  }
  if (refs.length > 10) console.log(`  ... and ${refs.length - 10} more`);

  await revalidateMediaCachesAfterScript(
    refs.map((r) => ({ id: r.id, slug: r.slug })),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
