import type { jsPDF } from "jspdf";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const FONT_FILE = "NotoSansKR-Regular.otf";
const FONT_FAMILY = "NotoSansKR";

/**
 * Registers subset Noto Sans KR for jsPDF (server-side only).
 * Place file at public/fonts/NotoSansKR-Regular.otf (see Noto CJK subset KR).
 */
export function registerNotoSansKrIfAvailable(doc: jsPDF): boolean {
  try {
    const custom = process.env.QUOTE_PDF_KR_FONT_PATH?.trim();
    const p = custom
      ? join(process.cwd(), custom)
      : join(process.cwd(), "public", "fonts", FONT_FILE);
    if (!existsSync(p)) return false;
    const buf = readFileSync(p);
    const binary = buf.toString("latin1");
    doc.addFileToVFS(FONT_FILE, binary);
    doc.addFont(FONT_FILE, FONT_FAMILY, "normal", undefined, "Identity-H");
    doc.setFont(FONT_FAMILY, "normal");
    return true;
  } catch (e) {
    console.warn("[jspdf-kr] font register failed:", e);
    return false;
  }
}

export function krFontFamily(hasKrFont: boolean): string {
  return hasKrFont ? FONT_FAMILY : "helvetica";
}
