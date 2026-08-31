import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

test("working UI scope has no arbitrary text-[Npx] after STEP 4 apply", () => {
  const out = execFileSync(
    process.execPath,
    [path.join(ROOT, "scripts/apply-typography-residual.mjs"), "--check"],
    { encoding: "utf8", cwd: ROOT },
  );
  const jsonStart = out.lastIndexOf("{");
  const summary = JSON.parse(out.slice(jsonStart)) as {
    arbitraryAfter: number;
  };
  assert.equal(summary.arbitraryAfter, 0, out);
});

test("residual scan report: only excluded zones may retain arbitrary px", () => {
  const report = JSON.parse(
    readFileSync(
      path.join(ROOT, "reports/typography-residual-scan-after.json"),
      "utf8",
    ),
  ) as {
    total: number;
    byZone: Record<string, number>;
  };
  const allowed = new Set(["document", "pdf-export", "brutalist"]);
  const outside = Object.entries(report.byZone).filter(
    ([zone, count]) => count > 0 && !allowed.has(zone),
  );
  assert.equal(
    outside.length,
    0,
    `unexpected zones with arbitrary px: ${JSON.stringify(outside)}`,
  );
});
