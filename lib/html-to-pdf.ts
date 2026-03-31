import html2canvas from "html2canvas";
import type { jsPDF } from "jspdf";

/**
 * 외부 http(s) 이미지는 canvas 오염(CORS)을 유발할 수 있어 클론에서 플레이스홀더로 교체합니다.
 */
function replaceUntrustedImagesInClone(clonedDoc: Document, cloned: HTMLElement) {
  cloned.querySelectorAll("img").forEach((node) => {
    const img = node as HTMLImageElement;
    const src = (img.getAttribute("src") ?? img.src ?? "").trim();
    if (!src || src.startsWith("data:") || src.startsWith("blob:")) {
      return;
    }
    if (!/^https?:\/\//i.test(src)) {
      return;
    }
    const inTable = img.closest("td");
    const ph = clonedDoc.createElement("div");
    ph.setAttribute("aria-hidden", "true");
    if (inTable) {
      ph.style.width = "48px";
      ph.style.height = "48px";
    } else {
      ph.style.width = "112px";
      ph.style.height = "56px";
    }
    ph.style.background = "#e2e8f0";
    ph.style.borderRadius = "4px";
    ph.style.flexShrink = "0";
    img.replaceWith(ph);
  });
}

async function waitForFontsAndPaint(): Promise<void> {
  if (typeof document === "undefined") return;
  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
  } catch {
    /* ignore */
  }
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/**
 * DOM 노드를 A4 세로 PDF로 래스터화 (한글은 스타일된 HTML 이미지로 보존).
 */
export async function htmlElementToPdf(element: HTMLElement): Promise<jsPDF> {
  if (typeof window === "undefined") {
    throw new Error("htmlElementToPdf is browser-only");
  }

  await waitForFontsAndPaint();

  const rect = element.getBoundingClientRect();
  const w = Math.max(1, Math.round(element.scrollWidth || rect.width));
  const h = Math.max(1, Math.round(element.scrollHeight || rect.height));

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: "#ffffff",
      width: w,
      height: h,
      windowWidth: w,
      windowHeight: h,
      scrollX: 0,
      scrollY: -window.scrollY,
      imageTimeout: 25000,
      onclone: replaceUntrustedImagesInClone,
    });
  } catch (e) {
    console.error("[html-to-pdf] html2canvas failed", {
      error: e instanceof Error ? e.message : String(e),
      size: { w, h },
      imgCount: element.querySelectorAll("img").length,
    });
    throw e;
  }

  const { default: JsPDF } = await import("jspdf");
  const pdf = new JsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * pageWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  return pdf;
}

/** ASCII 안전 파일명 (플래너·견적 공통) */
export function defaultPlannerPdfFilename(): string {
  return `THINKAD-planner-report-${Date.now()}.pdf`;
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function pdfToBlob(pdf: jsPDF): Blob {
  try {
    return pdf.output("blob");
  } catch (e) {
    console.error("[html-to-pdf] output blob failed, arraybuffer fallback", e);
    const ab = pdf.output("arraybuffer") as ArrayBuffer;
    return new Blob([ab], { type: "application/pdf" });
  }
}

/**
 * PDF 파일 다운로드 (FileSaver 우선, 실패 시 Blob 링크).
 */
export async function downloadPdfFromHtmlElement(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const pdf = await htmlElementToPdf(element);
  const safeName =
    filename.replace(/[/\\?%*:|"<>]/g, "-").trim() ||
    `THINKAD-${Date.now()}.pdf`;
  try {
    const blob = pdfToBlob(pdf);
    triggerBlobDownload(blob, safeName);
  } catch (e) {
    console.error("[html-to-pdf] blob download failed, trying save()", e);
    try {
      pdf.save(safeName);
    } catch (e2) {
      console.error("[html-to-pdf] save() failed", e2);
      const blob = pdfToBlob(pdf);
      const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      triggerBlobDownload(blob, `THINKAD_export_${ymd}.pdf`);
    }
  }
}

export async function htmlElementToPdfBase64(element: HTMLElement): Promise<string> {
  const pdf = await htmlElementToPdf(element);
  const uri = pdf.output("datauristring") as string;
  const i = uri.indexOf(",");
  return i >= 0 ? uri.slice(i + 1) : uri;
}
