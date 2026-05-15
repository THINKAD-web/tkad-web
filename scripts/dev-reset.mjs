#!/usr/bin/env node
/**
 * Dev webpack cache reset — fixes missing vendor-chunks (e.g. @formatjs.js)
 * when .next is deleted while `next dev` is still running.
 */
import { rmSync } from "node:fs";
import { execSync } from "node:child_process";

function run(cmd) {
  try {
    execSync(cmd, { stdio: "ignore" });
  } catch {
    /* ignore */
  }
}

run('pkill -f "next dev" || true');
rmSync(".next", { recursive: true, force: true });
console.log("[dev-reset] Stopped next dev (if any) and removed .next");
