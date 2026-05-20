/** 어드민 매체 추가/수정 모달 — localStorage 임시저장 */

export const ADMIN_MEDIA_FORM_DRAFT_KEY = "tkad-admin-media-form-draft-v1";

export type AdminMediaFormDraftPayload = {
  form: Record<string, unknown>;
  priceOptDrafts: unknown[];
  editingId: string | null;
  savedAt: string;
};

export function loadAdminMediaFormDraft(): AdminMediaFormDraftPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ADMIN_MEDIA_FORM_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminMediaFormDraftPayload;
    if (!parsed?.form || typeof parsed.form !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveAdminMediaFormDraft(payload: AdminMediaFormDraftPayload): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ADMIN_MEDIA_FORM_DRAFT_KEY, JSON.stringify(payload));
  } catch {
    // quota exceeded etc.
  }
}

export function clearAdminMediaFormDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ADMIN_MEDIA_FORM_DRAFT_KEY);
  } catch {
    // ignore
  }
}
