/**
 * 이번 슬라이스: 테스트 주소만 발송.
 * 문의 본문에서 추출한 고객 메일은 To 로 쓰지 않는다.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const HARD_ALLOWED_DOMAINS = new Set(["tkad.co.kr"]);

export type AllowlistDecision =
  | { ok: true; normalized: string }
  | { ok: false; error: string };

function extraExactAllowlist(): Set<string> {
  const raw = process.env.INQUIRY_AUTO_PROPOSAL_TEST_TO?.trim() ?? "";
  if (!raw) return new Set();
  return new Set(
    raw
      .split(/[,;\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function assertInquiryAutoProposalTestRecipient(
  raw: string,
): AllowlistDecision {
  const normalized = raw.trim().toLowerCase();
  if (!EMAIL_RE.test(normalized)) {
    return { ok: false, error: "invalid_email" };
  }
  if (extraExactAllowlist().has(normalized)) {
    return { ok: true, normalized };
  }
  const domain = normalized.split("@")[1] ?? "";
  if (HARD_ALLOWED_DOMAINS.has(domain)) {
    return { ok: true, normalized };
  }
  return { ok: false, error: "not_test_allowlist" };
}

/** 문의 본문에 있는 이메일을 발송 주소로 쓰지 않기 위한 가드 */
export function extractEmailsFromText(text: string): string[] {
  const found = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  return [...new Set(found.map((s) => s.trim().toLowerCase()))];
}
