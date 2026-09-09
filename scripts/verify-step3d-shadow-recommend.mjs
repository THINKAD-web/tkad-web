/**
 * STEP3d — shadow-recommend dry-run fingerprint (pilot fixture, no DB).
 *
 * Usage:
 *   node scripts/verify-step3d-shadow-recommend.mjs
 *   node scripts/verify-step3d-shadow-recommend.mjs --compare-main
 */
import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function runFingerprint(cwd = root) {
  const tsxEntry = join(root, "node_modules/tsx/dist/esm/index.mjs");
  const runner = join(root, "scripts/verify-step3d-shadow-fingerprint.mts");
  const out = execSync(`node --import "${tsxEntry}" "${runner}"`, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      INQUIRY_SHADOW_RECOMMEND: "0",
      NODE_PATH: join(root, "node_modules"),
    },
  });
  const trimmed = out.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`fingerprint output missing JSON object:\n${trimmed}`);
  }
  return JSON.parse(trimmed.slice(start, end + 1));
}

function diffFingerprints(a, b) {
  const keys = [
    "recommendCount",
    "recommendTopIds",
    "recommendTopScores",
    "shadowMixIds",
    "category",
    "mixJaccard",
  ];
  const diffs = [];
  for (const key of keys) {
    const sa = JSON.stringify(a[key]);
    const sb = JSON.stringify(b[key]);
    if (sa !== sb) {
      diffs.push({ key, current: a[key], main: b[key] });
    }
  }
  return diffs;
}

const compareMain = process.argv.includes("--compare-main");

console.log(`\n=== STEP3d shadow-recommend dry-run ===\n`);

const current = runFingerprint(root);
console.log("current branch fingerprint:");
console.log(JSON.stringify(current, null, 2));

const SHADOW_PROD_PATHS = [
  "lib/recommendation-service.ts",
  "lib/matching-engine.ts",
  "lib/inquiry-auto-proposal/shadow-recommend.ts",
  "lib/inquiry-auto-proposal/run-dry-run.ts",
  "lib/inquiry-auto-proposal/match-and-options.ts",
  "lib/inquiry-auto-proposal/select-inquiry-mix.ts",
  "lib/inquiry-auto-proposal/parse-inquiry-text.ts",
];

if (compareMain) {
  let worktreeDir;
  try {
    const prodDiff = execSync(
      `git diff main -- ${SHADOW_PROD_PATHS.join(" ")}`,
      { cwd: root, encoding: "utf8" },
    );
    if (prodDiff.trim()) {
      console.error("production shadow paths differ from main — aborting compare:");
      console.error(prodDiff);
      process.exit(1);
    }

    worktreeDir = mkdtempSync(join(tmpdir(), "tkad-main-"));
    execSync(`git worktree add --detach "${worktreeDir}" main`, {
      cwd: root,
      stdio: "pipe",
    });
    const modulesLink = join(worktreeDir, "node_modules");
    if (!existsSync(modulesLink)) {
      symlinkSync(join(root, "node_modules"), modulesLink, "dir");
    }
    const mainFp = runFingerprint(worktreeDir);
    console.log("\nmain branch fingerprint:");
    console.log(JSON.stringify(mainFp, null, 2));

    const diffs = diffFingerprints(current, mainFp);
    console.log("\ndiff vs main:");
    if (diffs.length === 0) {
      console.log(JSON.stringify({ diffCount: 0, pass: true }, null, 2));
      process.exit(0);
    }
    console.log(JSON.stringify({ diffCount: diffs.length, diffs, pass: false }, null, 2));
    process.exit(1);
  } catch (e) {
    console.error("compare-main failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  } finally {
    if (worktreeDir) {
      try {
        execSync(`git worktree remove --force "${worktreeDir}"`, {
          cwd: root,
          stdio: "pipe",
        });
      } catch {
        /* ignore */
      }
    }
  }
}
