export function proposalPdfFilename(brandName: string): string {
  const safe = brandName.replace(/[^\w가-힣.-]+/g, "_").slice(0, 40) || "brand";
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `THINKAD_제안서_${safe}_${ymd}.pdf`;
}
