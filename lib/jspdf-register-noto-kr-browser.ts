import type { jsPDF } from "jspdf";
import { NOTO_KR_FONT_FAMILY } from "@/lib/jspdf-kr-font-constants";

const FONT_FILE = "NotoSansKR-Regular.otf";

/** Browser-only: fetch OTF from `public/fonts/` and register for jsPDF. */
export async function registerNotoSansKrFromFetch(doc: jsPDF): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch("/fonts/NotoSansKR-Regular.otf", { cache: "force-cache" });
    if (!res.ok) {
      console.warn("[jspdf-kr] browser font HTTP", res.status, res.url);
      return false;
    }
    const ab = await res.arrayBuffer();
    const u8 = new Uint8Array(ab);
    let binary = "";
    for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]);
    doc.addFileToVFS(FONT_FILE, binary);
    doc.addFont(FONT_FILE, NOTO_KR_FONT_FAMILY, "normal", undefined, "Identity-H");
    doc.setFont(NOTO_KR_FONT_FAMILY, "normal");
    return true;
  } catch (e) {
    console.warn("[jspdf-kr] browser font register failed:", e);
    return false;
  }
}
