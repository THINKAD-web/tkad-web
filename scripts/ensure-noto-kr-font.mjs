/**
 * 한글 PDF 용 한국어 TTF 폰트 다운로드 (postinstall / CI).
 *
 * jsPDF v4 의 내장 폰트 파서는 TTF(glyf-based) 만 지원한다. CJK Noto 는 공식적으로
 * OTF/CFF 또는 TTC 만 배포하므로 jsPDF 와 함께 쓰려면 별도 TTF 가 필요하다.
 * 여기서는 CJK 한글 커버리지가 좋은 Pretendard TTF 를 받아 동일 파일명으로 저장한다.
 * 다른 TTF 를 쓰고 싶다면 `public/fonts/NotoSansKR-Regular.ttf` 로 직접 배치해도 된다.
 */
import fs from "node:fs";
import path from "node:path";

const DEST = path.join(
  process.cwd(),
  "public",
  "fonts",
  "NotoSansKR-Regular.ttf",
);
// Pretendard Regular TTF (한글·영문 풀 커버, jsDelivr CDN 안정)
const URL =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/web/static/Pretendard-Regular.ttf";

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
    // sanity check: TTF magic
    const magic = buf.subarray(0, 4).toString("ascii");
    if (
      buf[0] !== 0x00 ||
      buf[1] !== 0x01 ||
      buf[2] !== 0x00 ||
      buf[3] !== 0x00
    ) {
      console.warn("[ensure-noto-kr-font] not a TTF file (magic):", magic);
    }
    fs.writeFileSync(DEST, buf);
    console.log("[ensure-noto-kr-font] wrote", DEST, buf.length, "bytes");
  } catch (e) {
    console.warn("[ensure-noto-kr-font]", e);
  }
}

main();
