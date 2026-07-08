/** OoHQuote.adminNote 에 JSON 블록으로 저장 (DB migration 없이 계약 메타 보존) */

export const OOH_CONTRACT_META_PREFIX = "[[ooh-contract-meta:v1]]";

export type OohContractMeta = {
  clientRepName?: string;
  clientAddress?: string;
  campaignName?: string;
  productionCost?: string;
  mediaCount?: string;
  paymentMethod?: string;
};

export function parseOohContractMeta(
  adminNote: string | null | undefined,
): OohContractMeta {
  if (!adminNote?.trim()) return {};
  const idx = adminNote.indexOf(OOH_CONTRACT_META_PREFIX);
  if (idx < 0) return {};
  const jsonStart = adminNote.indexOf("{", idx);
  if (jsonStart < 0) return {};
  const jsonEnd = adminNote.indexOf("}", jsonStart);
  if (jsonEnd < 0) return {};
  try {
    const parsed = JSON.parse(
      adminNote.slice(jsonStart, jsonEnd + 1),
    ) as OohContractMeta;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function mergeOohContractMetaIntoAdminNote(
  adminNote: string | null | undefined,
  meta: OohContractMeta,
): string {
  const human = stripOohContractMetaFromAdminNote(adminNote).trim();
  const block = `${OOH_CONTRACT_META_PREFIX}${JSON.stringify(meta)}`;
  if (!human) return block;
  return `${human}\n\n${block}`;
}

export function stripOohContractMetaFromAdminNote(
  adminNote: string | null | undefined,
): string {
  if (!adminNote?.trim()) return "";
  const idx = adminNote.indexOf(OOH_CONTRACT_META_PREFIX);
  if (idx < 0) return adminNote.trim();
  return adminNote.slice(0, idx).trim();
}
