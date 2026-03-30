import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/**
 * External http(s) images often break canvas export (CORS taint). Data URLs / blob URLs are safe.
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

/**
 * Renders a DOM subtree (e.g. A4 quote preview) to a multi-page PDF via canvas rasterization.
 * Korean text is preserved because the PDF is an image of the styled HTML.
 */
export async function quoteElementToPdf(element: HTMLElement): Promise<jsPDF> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const canvas = await html2canvas(element, {
    scale: 1.75,
    useCORS: true,
    allowTaint: false,
    logging: false,
    backgroundColor: "#ffffff",
    imageTimeout: 20000,
    onclone: replaceUntrustedImagesInClone,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
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

function triggerBlobDownload(blob: Blob, filename: string) {
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

export async function downloadQuotePdfFromElement(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const pdf = await quoteElementToPdf(element);
  const blob = pdf.output("blob");
  try {
    triggerBlobDownload(blob, filename);
  } catch {
    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    triggerBlobDownload(blob, `THINKAD_quote_${ymd}.pdf`);
  }
}

/** Base64 payload for `/api/quote/email-pdf` (no `data:application/pdf;base64,` prefix). */
export async function quoteElementToPdfBase64(
  element: HTMLElement,
): Promise<string> {
  const pdf = await quoteElementToPdf(element);
  const uri = pdf.output("datauristring");
  const i = uri.indexOf(",");
  return i >= 0 ? uri.slice(i + 1) : uri;
}
