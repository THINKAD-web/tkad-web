export type InquiryTypeCode = "media" | "campaign" | "quote" | "other";
export type BudgetCode = "under_10m" | "10m_50m" | "50m_100m" | "over_100m";
export type InquiryAdminStatusCode = "new" | "in_progress" | "done";
export type StoredInquiryAdminMeta = {
  status?: InquiryAdminStatusCode;
  assignee?: string;
  note?: string;
  trashed?: boolean;
};

const INQUIRY_TYPES: readonly InquiryTypeCode[] = [
  "media",
  "campaign",
  "quote",
  "other",
];

const BUDGET_CODES: readonly BudgetCode[] = [
  "under_10m",
  "10m_50m",
  "50m_100m",
  "over_100m",
];

export function parseInquiryTypeCode(
  raw: string | undefined,
): InquiryTypeCode | null {
  if (!raw) return null;
  return INQUIRY_TYPES.includes(raw as InquiryTypeCode)
    ? (raw as InquiryTypeCode)
    : null;
}

export function parseBudgetCode(raw: string | undefined): BudgetCode | null {
  if (!raw) return null;
  return BUDGET_CODES.includes(raw as BudgetCode) ? (raw as BudgetCode) : null;
}

const INQUIRY_LABELS: Record<
  InquiryTypeCode,
  { ko: string; en: string }
> = {
  media: { ko: "매체 문의", en: "Media inquiry" },
  campaign: { ko: "캠페인 상담", en: "Campaign consultation" },
  quote: { ko: "견적 요청", en: "Quote request" },
  other: { ko: "기타", en: "Other" },
};

const BUDGET_LABELS: Record<BudgetCode, { ko: string; en: string }> = {
  under_10m: { ko: "1천만 이하", en: "Under ₩10M" },
  "10m_50m": { ko: "1천~5천만", en: "₩10M–50M" },
  "50m_100m": { ko: "5천만~1억", en: "₩50M–100M" },
  over_100m: { ko: "1억 이상", en: "Over ₩100M" },
};

const ADMIN_STATUS_LABELS: Record<
  InquiryAdminStatusCode,
  { ko: string; en: string }
> = {
  new: { ko: "미처리", en: "New" },
  in_progress: { ko: "진행중", en: "In progress" },
  done: { ko: "답변완료", en: "Done" },
};

export function parseInquiryAdminStatusCode(
  raw: string | null | undefined,
): InquiryAdminStatusCode | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();

  if (["new", "미처리"].includes(key)) return "new";
  if (["in_progress", "in progress", "진행중"].includes(key)) {
    return "in_progress";
  }
  if (["done", "답변완료", "완료"].includes(key)) return "done";
  return null;
}

export function inquiryTypeLabel(
  code: InquiryTypeCode,
  locale: string,
): string {
  const row = INQUIRY_LABELS[code];
  return locale === "ko" ? row.ko : row.en;
}

export function budgetLabel(code: BudgetCode, locale: string): string {
  const row = BUDGET_LABELS[code];
  return locale === "ko" ? row.ko : row.en;
}

export function inquiryAdminStatusLabel(
  code: InquiryAdminStatusCode,
  locale: string,
): string {
  const row = ADMIN_STATUS_LABELS[code];
  return locale === "ko" ? row.ko : row.en;
}

function encodeMetaValue(value: string): string {
  return encodeURIComponent(value.trim());
}

function decodeMetaValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseStoredContactInquiryMessage(message: string): {
  locale: "ko" | "en";
  inquiryLabel: string;
  budgetLabel: string;
  adminStatusLabel: string;
  adminAssignee: string;
  adminNote: string;
  adminTrashed: boolean;
  body: string;
} {
  const lines = message.replace(/\r\n/g, "\n").trim().split("\n");
  let locale: "ko" | "en" = "ko";
  let inquiryLabel = "";
  let budgetLabel = "";
  let adminStatusLabel = "";
  let adminAssignee = "";
  let adminNote = "";
  let adminTrashed = false;

  while (lines[0]?.trim() === "") lines.shift();

  const inquiryMatch = lines[0]?.match(/^\[(문의 유형|Inquiry type):\s*(.+?)\]$/);
  if (inquiryMatch) {
    locale = inquiryMatch[1] === "Inquiry type" ? "en" : "ko";
    inquiryLabel = inquiryMatch[2]?.trim() ?? "";
    lines.shift();
  }

  const budgetMatch = lines[0]?.match(
    /^\[(예상 예산|Estimated budget):\s*(.+?)\]$/,
  );
  if (budgetMatch) {
    locale = budgetMatch[1] === "Estimated budget" ? "en" : locale;
    budgetLabel = budgetMatch[2]?.trim() ?? "";
    lines.shift();
  }

  const adminStatusMatch = lines[0]?.match(
    /^\[(관리 상태|Admin status):\s*(.+?)\]$/,
  );
  if (adminStatusMatch) {
    locale = adminStatusMatch[1] === "Admin status" ? "en" : locale;
    adminStatusLabel = adminStatusMatch[2]?.trim() ?? "";
    lines.shift();
  }

  const assigneeMatch = lines[0]?.match(/^\[(담당자|Owner):\s*(.+?)\]$/);
  if (assigneeMatch) {
    locale = assigneeMatch[1] === "Owner" ? "en" : locale;
    adminAssignee = decodeMetaValue(assigneeMatch[2]?.trim() ?? "");
    lines.shift();
  }

  const noteMatch = lines[0]?.match(/^\[(관리 메모|Admin note):\s*(.+?)\]$/);
  if (noteMatch) {
    locale = noteMatch[1] === "Admin note" ? "en" : locale;
    adminNote = decodeMetaValue(noteMatch[2]?.trim() ?? "");
    lines.shift();
  }

  const trashMatch = lines[0]?.match(/^\[(휴지통|Trash):\s*(.+?)\]$/);
  if (trashMatch) {
    locale = trashMatch[1] === "Trash" ? "en" : locale;
    adminTrashed = ["yes", "true", "1"].includes(
      trashMatch[2]?.trim().toLowerCase() ?? "",
    );
    lines.shift();
  }

  while (lines[0]?.trim() === "") lines.shift();

  return {
    locale,
    inquiryLabel,
    budgetLabel,
    adminStatusLabel,
    adminAssignee,
    adminNote,
    adminTrashed,
    body: lines.join("\n").trim(),
  };
}

export function composeStoredMessage(
  inquiryLabel: string,
  userMessage: string,
  locale: string,
  budgetLbl?: string,
  adminStatusLbl?: string,
  adminAssignee?: string,
  adminNote?: string,
  adminTrashed?: boolean,
): string {
  const headers: string[] = [];
  const isKo = locale === "ko";

  if (inquiryLabel.trim()) {
    headers.push(
      isKo ? `[문의 유형: ${inquiryLabel}]` : `[Inquiry type: ${inquiryLabel}]`,
    );
  }
  if (budgetLbl != null && budgetLbl !== "") {
    headers.push(
      isKo ? `[예상 예산: ${budgetLbl}]` : `[Estimated budget: ${budgetLbl}]`,
    );
  }
  if (adminStatusLbl != null && adminStatusLbl !== "") {
    headers.push(
      isKo
        ? `[관리 상태: ${adminStatusLbl}]`
        : `[Admin status: ${adminStatusLbl}]`,
    );
  }
  if (adminAssignee != null && adminAssignee.trim() !== "") {
    headers.push(
      isKo
        ? `[담당자: ${encodeMetaValue(adminAssignee)}]`
        : `[Owner: ${encodeMetaValue(adminAssignee)}]`,
    );
  }
  if (adminNote != null && adminNote.trim() !== "") {
    headers.push(
      isKo
        ? `[관리 메모: ${encodeMetaValue(adminNote)}]`
        : `[Admin note: ${encodeMetaValue(adminNote)}]`,
    );
  }
  if (adminTrashed) {
    headers.push(isKo ? "[휴지통: yes]" : "[Trash: yes]");
  }

  const body = userMessage.trim();
  return headers.length > 0 ? `${headers.join("\n")}\n\n${body}` : body;
}

export function setStoredInquiryAdminMeta(
  message: string,
  meta: StoredInquiryAdminMeta,
): string {
  const parsed = parseStoredContactInquiryMessage(message);
  const statusLabel = meta.status
    ? inquiryAdminStatusLabel(meta.status, parsed.locale)
    : parsed.adminStatusLabel;
  const adminAssignee =
    meta.assignee !== undefined ? meta.assignee : parsed.adminAssignee;
  const adminNote = meta.note !== undefined ? meta.note : parsed.adminNote;
  const adminTrashed =
    meta.trashed !== undefined ? meta.trashed : parsed.adminTrashed;

  return composeStoredMessage(
    parsed.inquiryLabel,
    parsed.body || message.trim(),
    parsed.locale,
    parsed.budgetLabel,
    statusLabel,
    adminAssignee,
    adminNote,
    adminTrashed,
  );
}
