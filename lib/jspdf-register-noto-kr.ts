/**
 * Noto Sans KR registration for jsPDF (Identity-H). Used by admin / campaign / formal
 * quote helpers that still embed Korean.
 *
 * **Customer-facing quote PDF** (`build-quote-pdf.ts`) and **media compare PDF**
 * (`build-compare-pdf.ts`) intentionally use **Helvetica + English-only copy** so
 * text never relies on CJK font embedding or encoding.
 */
import type { jsPDF } from "jspdf";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NOTO_KR_FONT_FAMILY } from "@/lib/jspdf-kr-font-constants";

/** VFS 등록 시 파일명과 바이트가 일치해야 함 — 후보 파일마다 별도 이름 사용 */
export const NOTO_KR_FONT_CANDIDATES = [
  "NotoSansKR-Regular.otf",
  "NotoSansKR-Regular.ttf",
] as const;

function isVerboseFontLog(): boolean {
  return process.env.QUOTE_PDF_FONT_DEBUG === "1";
}

/** Vercel·로컬 등에서 `process.cwd()`와 무관하게 `public/fonts`를 찾기 위한 후보 경로 */
export function notoKrFontPathCandidates(): string[] {
  const cwd = process.cwd();
  const custom = process.env.QUOTE_PDF_KR_FONT_PATH?.trim();
  const paths: string[] = [];

  if (custom) {
    paths.push(join(cwd, custom));
    if (custom.startsWith("/")) paths.push(custom);
  }

  for (const name of NOTO_KR_FONT_CANDIDATES) {
    paths.push(join(cwd, "public", "fonts", name));
  }

  // 빌드 산출물 기준 (일부 배포에서 chunk 위치 기준)
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    for (const name of NOTO_KR_FONT_CANDIDATES) {
      paths.push(join(/*turbopackIgnore: true*/here, "..", "..", "..", "public", "fonts", name));
      paths.push(join(/*turbopackIgnore: true*/here, "..", "..", "public", "fonts", name));
      paths.push(join(/*turbopackIgnore: true*/here, "..", "public", "fonts", name));
    }
  } catch {
    /* import.meta.url 없는 환경 무시 */
  }

  const seen = new Set<string>();
  return paths.filter((p) => {
    const n = p.trim();
    if (!n || seen.has(n)) return false;
    seen.add(n);
    return true;
  });
}

export function notoKrFontResolvedPath(): string {
  const found = findReadableNotoKrFontPath();
  if (found) return found;
  const c = notoKrFontPathCandidates();
  return c[0] ?? join(process.cwd(), "public", "fonts", NOTO_KR_FONT_CANDIDATES[0]);
}

function findReadableNotoKrFontPath(): string | null {
  for (const p of notoKrFontPathCandidates()) {
    try {
      if (!existsSync(p)) continue;
      const st = statSync(p);
      if (!st.isFile() || st.size < 1000) continue;
      return p;
    } catch {
      /* next candidate */
    }
  }
  return null;
}

export function notoKrFontFileExists(): boolean {
  return findReadableNotoKrFontPath() !== null;
}

function logFontProbe(context: string, extra?: Record<string, unknown>) {
  if (!isVerboseFontLog()) return;
  console.log("[jspdf-kr] probe", {
    context,
    cwd: process.cwd(),
    VERCEL: process.env.VERCEL,
    candidates: notoKrFontPathCandidates(),
    resolved: findReadableNotoKrFontPath(),
    ...extra,
  });
}

function logFontLoadFailure(candidates: string[]) {
  const existsFlags = candidates.map((p) => {
    try {
      return { path: p, exists: existsSync(p) };
    } catch {
      return { path: p, exists: false as const };
    }
  });
  console.warn("[jspdf-kr] Noto KR unavailable — compare/quote PDF uses Helvetica + English fallback", {
    cwd: process.cwd(),
    VERCEL: process.env.VERCEL,
    NODE_ENV: process.env.NODE_ENV,
    candidatesChecked: existsFlags,
  });
}

/** Attach pre-read font bytes (Node Buffer). `vfsFileName` must match basename on disk. */
export function attachNotoSansKrBuffer(
  doc: jsPDF,
  buf: Buffer,
  vfsFileName: string,
): boolean {
  try {
    const binary = buf.toString("latin1");
    doc.addFileToVFS(vfsFileName, binary);
    doc.addFont(
      vfsFileName,
      NOTO_KR_FONT_FAMILY,
      "normal",
      undefined,
      "Identity-H",
    );
    doc.setFont(NOTO_KR_FONT_FAMILY, "normal");
    return true;
  } catch (e) {
    console.warn("[jspdf-kr] attach buffer failed:", e);
    return false;
  }
}

/**
 * Registers subset Noto Sans KR for jsPDF (server-side only).
 * Tries every candidate path; never throws to the caller.
 */
export function registerNotoSansKrIfAvailable(doc: jsPDF): boolean {
  logFontProbe("register:start");
  try {
    const candidates = notoKrFontPathCandidates();
    for (const p of candidates) {
      try {
        if (!existsSync(p)) {
          if (isVerboseFontLog()) console.log("[jspdf-kr] missing:", p);
          continue;
        }
        const st = statSync(p);
        if (!st.isFile() || st.size < 1000) {
          console.warn("[jspdf-kr] skip invalid file:", p, "size", st.size);
          continue;
        }
        const buf = readFileSync(p);
        const vfsName = basename(p);
        if (attachNotoSansKrBuffer(doc, buf, vfsName)) {
          if (isVerboseFontLog()) console.log("[jspdf-kr] loaded:", p, "bytes", buf.length);
          return true;
        }
      } catch (e) {
        console.warn("[jspdf-kr] candidate failed:", p, e);
      }
    }
    logFontProbe("register:fail", { tried: candidates.length });
    logFontLoadFailure(candidates);
    return false;
  } catch (e) {
    console.error("[jspdf-kr] registerNotoSansKrIfAvailable unexpected:", e);
    return false;
  }
}

export { krFontFamily } from "@/lib/jspdf-kr-font-constants";
