import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { QUOTE_STAMP_PUBLIC_PATH } from "@/lib/quote-stamp";

export { QUOTE_STAMP_PUBLIC_PATH };

function readPublicPngDataUrl(relativePath: string): string | null {
  const p = join(process.cwd(), "public", relativePath.replace(/^\//, ""));
  if (!existsSync(p)) return null;
  try {
    const buf = readFileSync(p);
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Optional PNG at public/brand/thinkad-logo.png */
export function loadThinkadLogoDataUrl(): string | null {
  return readPublicPngDataUrl("/brand/thinkad-logo.png");
}

/** Optional PNG at public/brand/thinkad-stamp.png */
export function loadQuoteStampDataUrl(): string | null {
  return readPublicPngDataUrl(QUOTE_STAMP_PUBLIC_PATH);
}
