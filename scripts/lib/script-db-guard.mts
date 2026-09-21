/**
 * Batch scripts — DATABASE_URL resolution + prod write safety.
 *
 * Incident (2026-09-11): `dotenv.config({ override: true })` on `.env.vercel.production`
 * overwrote a shell `DATABASE_URL` pointing at Preview, so `--execute` hit production.
 *
 * Rules:
 * 1. Shell `DATABASE_URL` captured at import time is never overwritten by dotenv files.
 * 2. Prod vs preview is classified by Neon hostname vs reference env files.
 * 3. Write mode (--execute / --apply) on production requires `--confirm-prod`
 *    (alias `--allow-prod` kept for older scripts).
 */
import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const GUARD_ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

/** Captured before any dotenv load in this module — shell wins over files. */
const SHELL_DATABASE_URL = process.env.DATABASE_URL?.trim() || null;

export type DbTarget = "production" | "preview" | "development" | "unknown";

export type ScriptDatabaseContext = {
  databaseUrl: string;
  hostname: string;
  target: DbTarget;
  /** shell | env-file | dotenv-default */
  source: string;
  sourceDetail: string;
  mode: "read" | "write";
  scriptName: string;
  prodWriteConfirmed: boolean;
};

export type AssertScriptDatabaseOptions = {
  scriptName: string;
  argv?: string[];
  /** When true, enforce --confirm-prod on production. Default: inferred from argv. */
  write?: boolean;
  /** Load .env.vercel.production when DATABASE_URL still unset (read scripts only). */
  allowProductionEnvFallback?: boolean;
};

const WRITE_FLAGS = ["--execute", "--apply", "--commit"];

export function hostnameFromUrl(url: string): string {
  try {
    return new URL(url.replace(/^postgresql:/i, "postgres:")).hostname;
  } catch {
    return "";
  }
}

function readDatabaseUrlFromEnvFile(relativePath: string): string | null {
  const abs = resolve(GUARD_ROOT, relativePath);
  if (!existsSync(abs)) return null;
  try {
    const raw = readFileSync(abs, "utf8");
    const m = raw.match(/^DATABASE_URL="([^"]*)"/m);
    if (!m?.[1]) return null;
    return m[1].replace(/\\n/g, "").replace(/\n/g, "").trim();
  } catch {
    return null;
  }
}

function referenceHostnames(): { production: Set<string>; preview: Set<string> } {
  const production = new Set<string>();
  const preview = new Set<string>();
  for (const url of [
    readDatabaseUrlFromEnvFile(".env.vercel.production"),
    readDatabaseUrlFromEnvFile(".env.vercel.production.fresh"),
    readDatabaseUrlFromEnvFile(".env.production.local"),
  ]) {
    const h = url ? hostnameFromUrl(url) : "";
    if (h) production.add(h);
  }
  for (const url of [readDatabaseUrlFromEnvFile(".env.preview.local")]) {
    const h = url ? hostnameFromUrl(url) : "";
    if (h) preview.add(h);
  }
  return { production, preview };
}

const REF_HOSTS = referenceHostnames();

export function classifyDatabaseTarget(hostname: string): DbTarget {
  const h = hostname.toLowerCase();
  if (!h) return "unknown";
  if (REF_HOSTS.production.has(h)) return "production";
  if (REF_HOSTS.preview.has(h)) return "preview";
  if (h === "localhost" || h === "127.0.0.1" || h.endsWith(".local")) {
    return "development";
  }
  return "unknown";
}

function isWriteArgv(argv: string[]): boolean {
  return WRITE_FLAGS.some((f) => argv.includes(f));
}

function hasProdWriteConfirm(argv: string[]): boolean {
  return argv.includes("--confirm-prod") || argv.includes("--allow-prod");
}

function restoreShellDatabaseUrl(): void {
  if (SHELL_DATABASE_URL) {
    process.env.DATABASE_URL = SHELL_DATABASE_URL;
  }
}

/**
 * Load dotenv files without clobbering shell DATABASE_URL.
 * `--env=production|preview|local` selects an explicit file when URL unset.
 */
export function loadScriptEnvFiles(argv: string[] = process.argv): void {
  const envFlag =
    argv.find((a) => a.startsWith("--env="))?.slice("--env=".length) ??
    (argv.includes("--prod") ? "production" : undefined) ??
    (argv.includes("--preview") ? "preview" : undefined);

  config({ path: resolve(GUARD_ROOT, ".env") });
  config({ path: resolve(GUARD_ROOT, ".env.local"), override: true });
  restoreShellDatabaseUrl();

  if (SHELL_DATABASE_URL) return;

  if (envFlag === "production") {
    config({ path: resolve(GUARD_ROOT, ".env.vercel.production"), override: true });
    restoreShellDatabaseUrl();
    return;
  }
  if (envFlag === "preview") {
    config({ path: resolve(GUARD_ROOT, ".env.preview.local"), override: true });
    restoreShellDatabaseUrl();
    return;
  }
  if (envFlag === "local") {
    return;
  }
}

export function resolveScriptDatabaseUrl(options: {
  allowProductionEnvFallback?: boolean;
} = {}): { url: string; source: string; sourceDetail: string } {
  loadScriptEnvFiles();

  if (SHELL_DATABASE_URL) {
    return {
      url: SHELL_DATABASE_URL,
      source: "shell",
      sourceDetail: "process.env.DATABASE_URL (set before script started)",
    };
  }

  const fromProcess = process.env.DATABASE_URL?.trim();
  if (fromProcess) {
    return {
      url: fromProcess,
      source: "env-file",
      sourceDetail: "dotenv (.env / .env.local / --env=*)",
    };
  }

  if (options.allowProductionEnvFallback) {
    config({ path: resolve(GUARD_ROOT, ".env.vercel.production"), override: true });
    restoreShellDatabaseUrl();
    const fallback = process.env.DATABASE_URL?.trim();
    if (fallback) {
      return {
        url: fallback,
        source: "env-file",
        sourceDetail: ".env.vercel.production (read-only fallback)",
      };
    }
  }

  throw new Error(
    "DATABASE_URL is not set. Export it in the shell, or pass --env=preview|production|local",
  );
}

export function printDatabaseBanner(ctx: ScriptDatabaseContext): void {
  const targetLabel =
    ctx.target === "production"
      ? "PRODUCTION"
      : ctx.target === "preview"
        ? "PREVIEW"
        : ctx.target === "development"
          ? "DEVELOPMENT (local)"
          : "UNKNOWN";

  const modeLabel = ctx.mode === "write" ? "WRITE" : "READ-ONLY";
  const prodWarn =
    ctx.target === "production" && ctx.mode === "write"
      ? ctx.prodWriteConfirmed
        ? "prod write CONFIRMED (--confirm-prod)"
        : "BLOCKED — pass --confirm-prod to write"
      : "";

  const lines = [
    "╔══════════════════════════════════════════════════════════════════╗",
    `║  DATABASE TARGET: ${targetLabel.padEnd(49)}║`,
    `║  Host: ${ctx.hostname.slice(0, 58).padEnd(58)}║`,
    `║  Mode: ${modeLabel.padEnd(58)}║`,
    `║  URL source: ${ctx.source} — ${ctx.sourceDetail.slice(0, 44).padEnd(44)}║`,
    ...(prodWarn ? [`║  ${prodWarn.slice(0, 62).padEnd(62)}║`] : []),
    `║  Script: ${ctx.scriptName.slice(0, 56).padEnd(56)}║`,
    "╚══════════════════════════════════════════════════════════════════╝",
  ];
  console.log("\n" + lines.join("\n") + "\n");
}

export function assertScriptDatabaseAccess(
  options: AssertScriptDatabaseOptions,
): ScriptDatabaseContext {
  const argv = options.argv ?? process.argv;
  const mode: "read" | "write" =
    options.write === true || (options.write !== false && isWriteArgv(argv))
      ? "write"
      : "read";

  const { url, source, sourceDetail } = resolveScriptDatabaseUrl({
    allowProductionEnvFallback:
      options.allowProductionEnvFallback ?? mode === "read",
  });

  const hostname = hostnameFromUrl(url);
  const target = classifyDatabaseTarget(hostname);
  const prodWriteConfirmed = hasProdWriteConfirm(argv);

  const ctx: ScriptDatabaseContext = {
    databaseUrl: url,
    hostname,
    target,
    source,
    sourceDetail,
    mode,
    scriptName: options.scriptName,
    prodWriteConfirmed,
  };

  printDatabaseBanner(ctx);

  if (mode === "write" && target === "production" && !prodWriteConfirmed) {
    throw new Error(
      [
        "Production database WRITE blocked.",
        "This script would modify production data.",
        "Re-run with --confirm-prod after dry-run on the intended database.",
        "To target preview instead: export DATABASE_URL from .env.preview.local",
        "  or pass --env=preview (without --confirm-prod).",
      ].join("\n"),
    );
  }

  if (mode === "write" && target === "unknown") {
    console.warn(
      "[script-db-guard] WARNING: write mode on unrecognized host — verify DATABASE_URL manually.",
    );
  }

  console.log(
    JSON.stringify(
      {
        dbGuard: {
          target: ctx.target,
          hostname: ctx.hostname,
          mode: ctx.mode,
          source: ctx.source,
          prodWriteConfirmed: ctx.prodWriteConfirmed,
        },
      },
      null,
      2,
    ),
  );

  return ctx;
}
