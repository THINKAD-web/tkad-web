import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Optional PNG at public/brand/thinkad-logo.png */
export function loadThinkadLogoDataUrl(): string | null {
  const p = join(process.cwd(), "public", "brand", "thinkad-logo.png");
  if (!existsSync(p)) return null;
  try {
    const buf = readFileSync(p);
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
