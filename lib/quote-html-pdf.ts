import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/**
 * Renders a DOM subtree (e.g. A4 quote preview) to a multi-page PDF via canvas rasterization.
 * Korean text is preserved because the PDF is an image of the styled HTML.
 */
export async function quoteElementToPdf(element: HTMLElement): Promise<jsPDF> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * pageWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  return pdf;
}

export async function downloadQuotePdfFromElement(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const pdf = await quoteElementToPdf(element);
  pdf.save(filename);
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
