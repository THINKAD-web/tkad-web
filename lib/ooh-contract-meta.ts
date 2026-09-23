/** OoHQuote.adminNote 에 JSON 블록으로 저장 (DB migration 없이 계약 메타 보존) */

export const OOH_CONTRACT_META_PREFIX = "[[ooh-contract-meta:v1]]";

export type OohContractMeta = {
  clientRepName?: string;
  clientAddress?: string;
  campaignName?: string;
  productionCost?: string;
  mediaCount?: string;
  paymentMethod?: string;
  /** 싱커드 담당자 — 계약 초대 메일 문의처 */
  accountManagerName?: string;
  accountManagerEmail?: string;
  accountManagerPhone?: string;
  /** VAT 별도 원 */
  extraProductionWon?: number;
  extraInstallWon?: number;
  extraOtherWon?: number;
  /** 제1조 기타사항 */
  otherNotes?: string;
};

/** 문자열 안의 `}` 를 포함해도 객체 하나 전체를 잘라낸다 */
function sliceJsonObject(text: string, openBrace: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = openBrace; i < text.length; i++) {
    const ch = text[i]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(openBrace, i + 1);
    }
  }
  return null;
}

export function parseOohContractMeta(
  adminNote: string | null | undefined,
): OohContractMeta {
  if (!adminNote?.trim()) return {};
  const idx = adminNote.indexOf(OOH_CONTRACT_META_PREFIX);
  if (idx < 0) return {};
  const jsonStart = adminNote.indexOf("{", idx + OOH_CONTRACT_META_PREFIX.length);
  if (jsonStart < 0) return {};
  const raw = sliceJsonObject(adminNote, jsonStart);
  if (!raw) {
    console.warn("[ooh-contract-meta] JSON object not closed after marker");
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as OohContractMeta;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      console.warn("[ooh-contract-meta] marker payload is not an object");
      return {};
    }
    return parsed;
  } catch (err) {
    console.warn("[ooh-contract-meta] JSON parse failed", err);
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
