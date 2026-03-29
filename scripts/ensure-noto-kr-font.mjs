/**
 * Downloads subset Noto Sans KR OTF for Korean PDF if missing (postinstall / CI).
 */
import fs from "node:fs";
import path from "node:path";

const DEST = path.join(process.cwd(), "public", "fonts", "NotoSansKR-Regular.otf");
const URL =
  "https://github.com/googlefonts/noto-cjk/raw/refs/heads/main/Sans/SubsetOTF/KR/NotoSansKR-Regular.otf";

async function main() {
  if (fs.existsSync(DEST)) return;
  fs.mkdirSync(path.dirname(DEST), { recursive: true });
  try {
    const res = await fetch(URL, { redirect: "follow" });
    if (!res.ok) {
      console.warn("[ensure-noto-kr-font] download failed:", res.status);
      return;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 10_000) {
      console.warn("[ensure-noto-kr-font] unexpected small file");
      return;
    }
    fs.writeFileSync(DEST, buf);
    console.log("[ensure-noto-kr-font] wrote", DEST);
  } catch (e) {
    console.warn("[ensure-noto-kr-font]", e);
  }
}

main();
