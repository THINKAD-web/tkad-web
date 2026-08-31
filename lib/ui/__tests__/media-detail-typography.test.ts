import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

test("media detail scope has no arbitrary text-[Npx] typography", () => {
  const out = execFileSync(
    process.execPath,
    [path.join(ROOT, "scripts/apply-media-detail-typography.mjs"), "--check"],
    { encoding: "utf8", cwd: ROOT },
  );
  const jsonStart = out.lastIndexOf("{");
  const summary = JSON.parse(out.slice(jsonStart)) as {
    arbitraryAfter: number;
  };
  assert.equal(summary.arbitraryAfter, 0, out);
});
