import { readFile } from "node:fs/promises";
import path from "node:path";

export const alt = "THINKAD 요금제 | Pricing plans";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** 정적 `og-pricing.png` — 동적 OgLayout 대체 */
export default async function Image() {
  const filePath = path.join(
    process.cwd(),
    "public/assets/og/og-pricing.png",
  );
  const buffer = await readFile(filePath);
  return new Response(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
