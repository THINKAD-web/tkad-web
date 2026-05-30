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
import { basename, join } from "node:path";
import { NOTO_KR_FONT_FAMILY } from "@/lib/jspdf-kr-font-constants";

/** VFS 등록 시 파일명과 바이트가 일치해야 함 — 후보 파일마다 별도 이름 사용 */
export const NOTO_KR_FONT_CANDIDATES = [
  "NotoSansKR-Regular.ttf",
  "Pretendard-Regular.ttf",
  "NotoSansKR-Regular.otf",
] as const;

function isVerboseFontLog(): boolean {
  return process.env.QUOTE_PDF_FONT_DEBUG === "1";
}

/**
 * `public/fonts` 후보 경로 목록.
 *
 * NOTE: Vercel/Turbopack NFT(Node File Trace)가 모듈 그래프 전체를 트레이스하지
 * 않도록, `import.meta.url`/`fileURLToPath` 같은 동적 파일시스템 연산은 피한다.
 * 공식 배포(Vercel)에서는 `process.cwd()`가 프로젝트 루트를 가리키므로 이것으로
 * 충분하다. 추가 경로가 필요한 환경은 `QUOTE_PDF_KR_FONT_PATH`로 지정한다.
 */
export function notoKrFontPathCandidates(): string[] {
  const custom = process.env.QUOTE_PDF_KR_FONT_PATH?.trim();
  const paths: string[] = [];

  if (custom) {
    paths.push(join(/*turbopackIgnore: true*/ process.cwd(), custom));
    if (custom.startsWith("/")) paths.push(custom);
  }

  for (const name of NOTO_KR_FONT_CANDIDATES) {
    paths.push(
      join(/*turbopackIgnore: true*/ process.cwd(), "public", "fonts", name),
    );
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

const SERVER_FONT_URLS = [
  // Pretendard regular (TTF, glyf-based) — jsPDF v4 compatible
  "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/alternative/Pretendard-Regular.ttf",
  "https://raw.githubusercontent.com/orioncactus/pretendard/v1.3.9/packages/pretendard/dist/public/static/alternative/Pretendard-Regular.ttf",
] as const;

let cachedServerTtf: Buffer | null = null;

function isValidTtf(buf: Buffer): boolean {
  // TrueType sfnt magic: 00 01 00 00
  return (
    buf.length > 10_000 &&
    buf[0] === 0x00 &&
    buf[1] === 0x01 &&
    buf[2] === 0x00 &&
    buf[3] === 0x00
  );
}

async function fetchServerTtf(): Promise<Buffer | null> {
  if (cachedServerTtf) return cachedServerTtf;
  for (const url of SERVER_FONT_URLS) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch(url, { redirect: "follow", signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (!isValidTtf(buf)) continue;
      cachedServerTtf = buf;
      return buf;
    } catch {
      // try next
    }
  }
  return null;
}

/** Attach pre-read font bytes (Node Buffer). `vfsFileName` must match basename on disk. */
export function attachNotoSansKrBuffer(
  doc: jsPDF,
  buf: Buffer,
  vfsFileName: string,
): boolean {
  try {
    // jsPDF v4 내장 폰트 파서는 TTF(glyf table) 만 지원한다.
    // OTF(CFF/CFF2) 를 넣으면 parse 는 통과한 듯 보이지만 metadata.Unicode 가
    // 미설정된 상태로 남아 이후 doc.text() 호출에서
    // "Cannot read properties of undefined (reading 'Unicode')" 로 터진다.
    // 폰트 매직 4바이트로 판별해 OTF 면 등록을 거부하고 Helvetica 로 폴백한다.
    const magic = buf.length >= 4 ? buf.subarray(0, 4).toString("ascii") : "";
    const isOtf = magic === "OTTO"; // CFF-backed OpenType
    const isTtc = magic === "ttcf" || magic === "OTTO" || magic === "true";
    if (isOtf) {
      console.warn(
        "[jspdf-kr] OTF font is not supported by jsPDF v4 parser — skipping registration",
        { vfsFileName, bytes: buf.length },
      );
      return false;
    }
    if (magic === "ttcf") {
      console.warn("[jspdf-kr] TTC (collection) not supported, skipping");
      return false;
    }
    // TTF (\x00\x01\x00\x00) 인 경우에만 등록. base64 문자열 경로로 통일해
    // jsPDF 의 font loader(addFont 이벤트)가 atob 로 안전하게 복원하도록 함.
    void isTtc;
    const base64 = buf.toString("base64");
    doc.addFileToVFS(vfsFileName, base64);
    doc.addFont(
      vfsFileName,
      NOTO_KR_FONT_FAMILY,
      "normal",
      undefined,
      "Identity-H",
    );
    // jsPDF has no synthetic bold for embedded CJK — register same TTF as bold
    // so setFont(fam, "bold") does not fall back to Helvetica (garbled Korean).
    doc.addFont(
      vfsFileName,
      NOTO_KR_FONT_FAMILY,
      "bold",
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

/**
 * Server PDF helpers can use this to guarantee KR glyphs in Vercel,
 * even when `public/fonts` isn't present in the runtime bundle.
 */
export async function ensureKrFontForServerPdf(doc: jsPDF): Promise<boolean> {
  if (registerNotoSansKrIfAvailable(doc)) return true;
  const buf = await fetchServerTtf();
  if (!buf) return false;
  // Stable VFS name (must be treated as TTF)
  return attachNotoSansKrBuffer(doc, buf, "Pretendard-Regular.ttf");
}
