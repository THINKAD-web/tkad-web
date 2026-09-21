import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import {
  assertScriptDatabaseAccess,
  classifyDatabaseTarget,
  hostnameFromUrl,
} from "../script-db-guard.mts";

const root = resolve(import.meta.dirname, "../../..");

function prodHostFromRepo(): string | null {
  const f = resolve(root, ".env.vercel.production");
  if (!existsSync(f)) return null;
  const m = readFileSync(f, "utf8").match(/^DATABASE_URL="([^"]*)"/m);
  if (!m?.[1]) return null;
  return hostnameFromUrl(m[1].replace(/\\n/g, "").trim());
}

test("classifyDatabaseTarget recognizes production host from .env.vercel.production", () => {
  const host = prodHostFromRepo();
  if (!host) {
    console.log("skip: .env.vercel.production not present");
    return;
  }
  assert.equal(classifyDatabaseTarget(host), "production");
});

test("classifyDatabaseTarget — localhost is development", () => {
  assert.equal(classifyDatabaseTarget("localhost"), "development");
  assert.equal(classifyDatabaseTarget("127.0.0.1"), "development");
});

test("classifyDatabaseTarget — unknown neon branch", () => {
  assert.equal(
    classifyDatabaseTarget("ep-random-branch-pooler.c-3.us-east-1.aws.neon.tech"),
    "unknown",
  );
});

function runGuardProbe(argvFlags: string[]): { status: number | null; stdout: string; stderr: string } {
  const probe = `
import { assertScriptDatabaseAccess } from "./scripts/lib/script-db-guard.mts";
try {
  const ctx = assertScriptDatabaseAccess({
    scriptName: "guard-probe",
    write: true,
    argv: ["node", "probe", ${argvFlags.map((f) => JSON.stringify(f)).join(", ")}],
  });
  console.log(JSON.stringify({ ok: true, target: ctx.target, confirmed: ctx.prodWriteConfirmed }));
} catch (e) {
  console.error(String(e instanceof Error ? e.message : e));
  process.exit(1);
}
`;
  return spawnSync("npx", ["tsx", "-e", probe], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: "" },
    encoding: "utf8",
  });
}

test("production write blocked without --confirm-prod (subprocess, no shell URL)", () => {
  if (!prodHostFromRepo()) {
    console.log("skip: .env.vercel.production not present");
    return;
  }
  const result = runGuardProbe(["--execute", "--env=production"]);
  assert.notEqual(result.status, 0, result.stdout);
  assert.match(result.stderr, /Production database WRITE blocked/);
});

test("production write allowed with --confirm-prod (subprocess, no shell URL)", () => {
  if (!prodHostFromRepo()) {
    console.log("skip: .env.vercel.production not present");
    return;
  }
  const result = runGuardProbe(["--execute", "--env=production", "--confirm-prod"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const parsed = JSON.parse(result.stdout.trim().split("\n").pop()!) as {
    ok: boolean;
    target: string;
    confirmed: boolean;
  };
  assert.equal(parsed.target, "production");
  assert.equal(parsed.confirmed, true);
});

test("shell DATABASE_URL wins over --env=production (subprocess)", () => {
  const previewPath = resolve(root, ".env.preview.local");
  const prodPath = resolve(root, ".env.vercel.production");
  if (!existsSync(previewPath) || !existsSync(prodPath)) {
    console.log("skip: preview or production env file missing");
    return;
  }
  const previewUrl = readFileSync(previewPath, "utf8").match(/^DATABASE_URL="([^"]*)"/m)?.[1];
  if (!previewUrl) {
    console.log("skip: no DATABASE_URL in .env.preview.local");
    return;
  }
  const probe = `
import { assertScriptDatabaseAccess, classifyDatabaseTarget, hostnameFromUrl } from "./scripts/lib/script-db-guard.mts";
const ctx = assertScriptDatabaseAccess({
  scriptName: "shell-win-probe",
  write: false,
  argv: ["node", "probe", "--env=production"],
});
const target = classifyDatabaseTarget(ctx.hostname);
if (ctx.source !== "shell") {
  console.error("expected shell source, got", ctx.source);
  process.exit(2);
}
if (target === "production") {
  console.error("shell URL was overwritten by production env");
  process.exit(3);
}
console.log("OK", ctx.hostname);
`;
  const result = spawnSync("npx", ["tsx", "-e", probe], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: previewUrl.replace(/\\n/g, "").trim() },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /OK/);
});
