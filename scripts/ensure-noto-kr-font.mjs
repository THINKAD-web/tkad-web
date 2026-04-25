/**
 * 한글 PDF 용 한국어 TTF 폰트 확보 (postinstall / CI).
 *
 * jsPDF v4 의 내장 폰트 파서는 TTF(glyf-based) 만 지원한다. CJK Noto 는 공식적으로
 * OTF/CFF 또는 TTC 만 배포하므로 jsPDF 와 함께 쓰려면 별도 TTF 가 필요하다.
 * 우선순위:
 *   1. `pretendard` npm 패키지의 alternative TTF 를 복사 (네트워크 무관, 가장 안정)
 *   2. 1 이 실패하면 jsDelivr / GitHub raw CDN 미러를 순서대로 다운로드
 * 결과적으로 단일 CDN 의 일시 403 으로 캠페인 보고서 PDF 가 영어로만 떨어지는
 * 사고를 막는다.
 */
import fs from "node:fs";
import path from "node:path";

const DEST = path.join(
  process.cwd(),
  "public",
  "fonts",
  "NotoSansKR-Regular.ttf",
);

const NPM_TTF_CANDIDATES = [
  // pretendard@>=1.3.9
  "node_modules/pretendard/dist/public/static/alternative/Pretendard-Regular.ttf",
  "node_modules/pretendard/dist/public/variable/PretendardVariable.ttf",
];

const URLS = [
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/web/static/Pretendard-Regular.ttf",
  "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/alternative/Pretendard-Regular.ttf",
  "https://raw.githubusercontent.com/orioncactus/pretendard/v1.3.9/packages/pretendard/dist/public/static/alternative/Pretendard-Regular.ttf",
];

function isValidTtf(buf) {
  if (!buf || buf.length < 10_000) return false;
  // sfnt magic: 00 01 00 00 (TrueType) 또는 'OTTO' (OpenType)
  return buf[0] === 0x00 && buf[1] === 0x01 && buf[2] === 0x00 && buf[3] === 0x00;
}

function tryFromNpmPackage() {
  for (const rel of NPM_TTF_CANDIDATES) {
    const full = path.join(process.cwd(), rel);
    try {
      if (!fs.existsSync(full)) continue;
      const buf = fs.readFileSync(full);
      if (!isValidTtf(buf)) continue;
      fs.copyFileSync(full, DEST);
      console.log(
        "[ensure-noto-kr-font] copied from",
        rel,
        "→",
        DEST,
        buf.length,
        "bytes",
      );
      return true;
    } catch (e) {
      console.warn(
        "[ensure-noto-kr-font] copy failed",
        rel,
        e instanceof Error ? e.message : e,
      );
    }
  }
  return false;
}

async function tryFromCdn() {
  for (const url of URLS) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) {
        console.warn(`[ensure-noto-kr-font] ${res.status} ${url}`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (!isValidTtf(buf)) {
        console.warn(
          "[ensure-noto-kr-font] invalid TTF body",
          url,
          buf.length,
          "bytes",
        );
        continue;
      }
      fs.writeFileSync(DEST, buf);
      console.log(
        "[ensure-noto-kr-font] downloaded",
        DEST,
        buf.length,
        "bytes from",
        url,
      );
      return true;
    } catch (e) {
      console.warn(
        "[ensure-noto-kr-font] fetch failed",
        url,
        e instanceof Error ? e.message : e,
      );
    }
  }
  return false;
}

async function main() {
  if (fs.existsSync(DEST) && fs.statSync(DEST).size > 10_000) return;
  fs.mkdirSync(path.dirname(DEST), { recursive: true });

  if (tryFromNpmPackage()) return;
  if (await tryFromCdn()) return;

  console.warn(
    "[ensure-noto-kr-font] all sources failed — Korean PDFs may fall back to ASCII. " +
      "Provide TTF manually at public/fonts/NotoSansKR-Regular.ttf or set QUOTE_PDF_KR_FONT_PATH.",
  );
}

main();
