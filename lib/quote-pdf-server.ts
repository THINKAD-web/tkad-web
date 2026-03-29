import { jsPDF } from "jspdf";

export function applyTemplateVars(
  template: string,
  vars: Record<string, string>,
): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}

export function htmlToPlainLines(html: string): string[] {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export function buildQuotePdfBase64(lines: string[]): string {
  const doc = new jsPDF();
  let y = 18;
  doc.setFontSize(14);
  doc.text("THINKAD · Quote / 견적", 20, y);
  y += 12;
  doc.setFontSize(10);
  for (const line of lines) {
    const wrapped = doc.splitTextToSize(line, 170);
    for (const w of wrapped) {
      if (y > 285) {
        doc.addPage();
        y = 20;
      }
      doc.text(w, 20, y);
      y += 6;
    }
  }
  const out = doc.output("arraybuffer");
  return Buffer.from(out as ArrayBuffer).toString("base64");
}
