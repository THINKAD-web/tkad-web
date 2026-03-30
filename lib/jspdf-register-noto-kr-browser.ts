import type { jsPDF } from "jspdf";
import { NOTO_KR_FONT_FAMILY } from "@/lib/jspdf-kr-font-constants";

/** Local (postinstall) then CDN fallback. VFS 이름은 URL 파일명과 같아야 함 (.otf / .ttf). */
const FONT_URLS = [
  "/fonts/NotoSansKR-Regular.otf",
  "/fonts/NotoSansKR-Regular.ttf",
  "https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Sans/SubsetOTF/KR/NotoSansKR-Regular.otf",
];

/** Browser-only: fetch font and register for jsPDF. */
export async function registerNotoSansKrFromFetch(doc: jsPDF): Promise<boolean> {
  if (typeof window === "undefined") return false;
  for (const url of FONT_URLS) {
    try {
      const res = await fetch(url, { cache: "force-cache", mode: "cors" });
      if (!res.ok) {
        console.warn("[jspdf-kr] browser font HTTP", res.status, url);
        continue;
      }
      const ab = await res.arrayBuffer();
      if (ab.byteLength < 10_000) {
        console.warn("[jspdf-kr] unexpected small font file:", url);
        continue;
      }
      const u8 = new Uint8Array(ab);
      let binary = "";
      for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]);
      const pathPart = url.split("?")[0] ?? url;
      const vfsName =
        pathPart.includes("/") && pathPart.split("/").pop()
          ? pathPart.split("/").pop()!
          : "NotoSansKR-Regular.otf";
      doc.addFileToVFS(vfsName, binary);
      doc.addFont(vfsName, NOTO_KR_FONT_FAMILY, "normal", undefined, "Identity-H");
      doc.setFont(NOTO_KR_FONT_FAMILY, "normal");
      return true;
    } catch (e) {
      console.warn("[jspdf-kr] font fetch failed:", url, e);
    }
  }
  console.warn("[jspdf-kr] all Noto KR sources failed — PDF text may not render Korean");
  return false;
}
