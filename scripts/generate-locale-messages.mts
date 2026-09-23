#!/usr/bin/env node
/**
 * PR7 — batch-generate messages/ja.json and messages/zh.json from messages/en.json.
 * One Claude call per top-level namespace chunk (large namespaces split by sub-key).
 *
 * Usage:
 *   npx tsx scripts/generate-locale-messages.mts
 *   npx tsx scripts/generate-locale-messages.mts --only=media,planner
 *   npx tsx scripts/generate-locale-messages.mts --dry-run
 *
 * Only one non-dry-run instance at a time (scripts/.generate-locale-messages.pid).
 */
import { config } from "dotenv";
config();
config({ path: ".env.local" });

import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { AI_MODELS } from "../lib/ai-models.ts";
import {
  compareMessageKeySets,
  flattenMessageKeys,
} from "../lib/locale-readiness.ts";

const ROOT = process.cwd();
const PID_FILE = join(ROOT, "scripts", ".generate-locale-messages.pid");
const DRY = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const ONLY = onlyArg
  ? new Set(onlyArg.slice("--only=".length).split(",").map((s) => s.trim()))
  : null;

const MAX_LEAVES_PER_CALL = 100;

type JsonObj = Record<string, unknown>;

function isPidAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "EPERM") return true;
    return false;
  }
}

function readPidFile(): number | null {
  if (!existsSync(PID_FILE)) return null;
  const raw = readFileSync(PID_FILE, "utf8").trim();
  const pid = Number.parseInt(raw, 10);
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

/** One live batch run at a time (skipped for --dry-run). */
function acquireRunLock(): void {
  if (DRY) return;

  const existing = readPidFile();
  if (existing !== null) {
    if (existing !== process.pid && isPidAlive(existing)) {
      console.error(
        `generate-locale-messages already running (PID ${existing}). ` +
          `Wait for it to finish, or if it crashed, delete ${PID_FILE} and retry.`,
      );
      process.exit(1);
    }
    try {
      unlinkSync(PID_FILE);
    } catch {
      /* stale or raced */
    }
  }

  writeFileSync(PID_FILE, `${process.pid}\n`, "utf8");
}

function releaseRunLock(): void {
  if (DRY) return;
  if (!existsSync(PID_FILE)) return;
  const owner = readPidFile();
  if (owner !== process.pid) return;
  try {
    unlinkSync(PID_FILE);
  } catch {
    /* already removed */
  }
}

function loadMessages(name: string): JsonObj {
  return JSON.parse(readFileSync(join(ROOT, "messages", name), "utf8")) as JsonObj;
}

function saveMessages(name: string, data: JsonObj) {
  const dir = join(ROOT, "messages");
  const target = join(dir, name);
  const tmp = join(dir, `.${name}.tmp-${process.pid}`);
  const body = `${JSON.stringify(data, null, 2)}\n`;
  writeFileSync(tmp, body, "utf8");
  renameSync(tmp, target);
}

function assertPlainObject(value: unknown, label: string): asserts value is JsonObj {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.prototype.toString.call(value) !== "[object Object]"
  ) {
    throw new Error(`${label}: expected plain object, got ${typeof value}`);
  }
}

function normalizeLocalePart(part: JsonObj, ns: string): JsonObj {
  assertPlainObject(part, `normalizeLocalePart(${ns})`);
  if (part[ns] !== undefined) {
    assertPlainObject(part[ns], `${ns} nested`);
    return { [ns]: part[ns] as JsonObj };
  }
  return part;
}

function deepMerge(base: JsonObj, patch: JsonObj): JsonObj {
  assertPlainObject(patch, "deepMerge patch");
  const out: JsonObj = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (
      v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      out[k] &&
      typeof out[k] === "object" &&
      !Array.isArray(out[k])
    ) {
      out[k] = deepMerge(out[k] as JsonObj, v as JsonObj);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function slicesForNamespace(en: JsonObj, ns: string): { label: string; slice: JsonObj }[] {
  const root = en[ns];
  if (root === undefined) return [];
  const full = { [ns]: root };
  const leaves = flattenMessageKeys(full).length;
  if (leaves <= MAX_LEAVES_PER_CALL) {
    return [{ label: ns, slice: full }];
  }
  if (!root || typeof root !== "object" || Array.isArray(root)) {
    return [{ label: ns, slice: full }];
  }
  return Object.keys(root as JsonObj).map((child) => ({
    label: `${ns}.${child}`,
    slice: { [ns]: { [child]: (root as JsonObj)[child] } },
  }));
}

function namespaceMessagesComplete(
  en: JsonObj,
  ja: JsonObj,
  ns: string,
): boolean {
  const cmp = compareMessageKeySets(
    { [ns]: en[ns] },
    { [ns]: ja[ns] ?? {} },
  );
  return cmp.complete;
}

/** Copy only keys that exist in `loc`, matching paths in `template`. */
function projectActualSubtree(loc: JsonObj, template: JsonObj): JsonObj {
  const out: JsonObj = {};
  for (const [k, v] of Object.entries(template)) {
    if (!(k in loc)) continue;
    const lv = loc[k];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      if (lv && typeof lv === "object" && !Array.isArray(lv)) {
        out[k] = projectActualSubtree(lv as JsonObj, v as JsonObj);
      }
      continue;
    }
    out[k] = lv;
  }
  return out;
}

function sliceMessagesComplete(
  enSlice: JsonObj,
  ja: JsonObj,
  zh: JsonObj,
): boolean {
  const jaActual = projectActualSubtree(ja, enSlice);
  const zhActual = projectActualSubtree(zh, enSlice);
  return (
    compareMessageKeySets(enSlice, jaActual).complete &&
    compareMessageKeySets(enSlice, zhActual).complete
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableApiError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as { status?: number; message?: string };
  if (err.status === 429 || err.status === 529 || err.status === 503) return true;
  const msg = String(err.message ?? e);
  if (/Incomplete model output/i.test(msg)) return true;
  return /rate limit|overloaded|timeout|ECONNRESET|ETIMEDOUT/i.test(msg);
}

async function withApiRetry<T>(
  label: string,
  fn: () => Promise<T>,
  maxAttempts = 5,
): Promise<T> {
  let last: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!isRetryableApiError(e) || attempt === maxAttempts) throw e;
      const delayMs = Math.min(60_000, 2_000 * 2 ** (attempt - 1));
      console.warn(
        `↻ ${label}: retry ${attempt}/${maxAttempts - 1} in ${delayMs}ms — ${
          e instanceof Error ? e.message : e
        }`,
      );
      await sleep(delayMs);
    }
  }
  throw last;
}

async function translateSlice(
  client: Anthropic,
  label: string,
  enSlice: JsonObj,
): Promise<{ ja: JsonObj; zh: JsonObj }> {
  const ns = Object.keys(enSlice)[0] ?? label;
  const res = await client.messages.create({
    model: AI_MODELS.contentGen,
    max_tokens: 16_000,
    system: `You translate next-intl JSON message slices for THINKAD (Korean OOH ad platform UI).
Input is English JSON. Output Japanese (ja) and Simplified Chinese (zh-Hans) with IDENTICAL key structure — only translate string leaf values.
Keep placeholders like {name}, {count}, ICU plurals, and HTML unchanged. Keep brand THINKAD.`,
    messages: [{ role: "user", content: JSON.stringify(enSlice) }],
    tools: [
      {
        name: "emit_locale_messages",
        description: "Translated JSON for ja and zh with same keys as input",
        input_schema: {
          type: "object",
          additionalProperties: false,
          required: ["ja", "zh"],
          properties: {
            ja: { type: "object" },
            zh: { type: "object" },
          },
        },
      },
    ],
    tool_choice: { type: "tool", name: "emit_locale_messages" },
  });

  for (const block of res.content) {
    if (block.type === "tool_use" && block.name === "emit_locale_messages") {
      const input = block.input as { ja?: JsonObj; zh?: JsonObj };
      if (!input.ja || !input.zh) {
        throw new Error(`No tool output for ${label}`);
      }
      const jaRoot = normalizeLocalePart(
        input.ja[ns] !== undefined ? { [ns]: input.ja[ns] } : input.ja,
        ns,
      );
      const zhRoot = normalizeLocalePart(
        input.zh[ns] !== undefined ? { [ns]: input.zh[ns] } : input.zh,
        ns,
      );
      assertPlainObject(jaRoot, `${label} ja`);
      assertPlainObject(zhRoot, `${label} zh`);
      return { ja: jaRoot, zh: zhRoot };
    }
  }
  throw new Error(`No tool output for ${label}`);
}

async function main() {
  acquireRunLock();
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey && !DRY) {
      throw new Error("ANTHROPIC_API_KEY required");
    }

    const en = loadMessages("en.json");
    let ja = loadMessages("ja.json");
    let zh = loadMessages("zh.json");
    const namespaces = Object.keys(en).filter((ns) => !ONLY || ONLY.has(ns));

    console.log(`Namespaces: ${namespaces.length}${DRY ? " (dry-run)" : ""}`);

    const client = apiKey ? new Anthropic({ apiKey }) : null;
    const t0 = Date.now();
    let calls = 0;

    for (const ns of namespaces) {
      if (!FORCE && namespaceMessagesComplete(en, ja, ns)) {
        console.log(`↷ ${ns} (complete)`);
        continue;
      }
      const slices = slicesForNamespace(en, ns);
      for (const { label, slice } of slices) {
        if (!FORCE && sliceMessagesComplete(slice, ja, zh)) {
          console.log(`↷ ${label} (complete)`);
          continue;
        }
        console.log(`→ ${label}`);
        if (DRY) continue;
        if (!client) break;
        try {
          const { ja: jaPart, zh: zhPart } = await withApiRetry(label, () =>
            translateSlice(client!, label, slice),
          );
          const jaCheck = compareMessageKeySets(slice, jaPart);
          const zhCheck = compareMessageKeySets(slice, zhPart);
          if (!jaCheck.complete || !zhCheck.complete) {
            throw new Error(
              `Incomplete model output for ${label} (ja missing ${jaCheck.missing.length}, zh missing ${zhCheck.missing.length})`,
            );
          }
          ja = deepMerge(ja, jaPart);
          zh = deepMerge(zh, zhPart);
          saveMessages("ja.json", ja);
          saveMessages("zh.json", zh);
          calls += 1;
        } catch (e) {
          console.error(`✗ ${label}:`, e instanceof Error ? e.message : e);
          throw e;
        }
      }
    }

    const sec = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`Done. API calls: ${calls}, elapsed: ${sec}s`);
  } finally {
    releaseRunLock();
  }
}

for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
  process.on(sig, () => {
    console.error(`\nStopped (${sig}) — re-run to resume; completed slices are skipped.`);
    releaseRunLock();
    process.exit(128 + (sig === "SIGINT" ? 2 : sig === "SIGTERM" ? 15 : 1));
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
