import { z } from "zod";

const PHONE_RE = /^[\d\-+() ]{8,}$/;

/**
 * 한국 사업자등록번호(10자리) 체크섬 검증.
 *
 * 알고리즘(국세청 공식):
 *   weights = [1, 3, 7, 1, 3, 7, 1, 3, 5]
 *   sum     = Σ digit[i] × weights[i] (i=0..8)
 *   sum    += floor(digit[8] × 5 / 10)        // 9번째 자리 5배의 캐리
 *   check   = (10 − sum % 10) % 10
 *   valid   ⇔ check === digit[9]
 */
export function isValidKoreanBusinessNumber(input: string): boolean {
  const digits = input.replace(/\D/g, "");
  if (digits.length !== 10) return false;
  const ds = digits.split("").map((c) => Number.parseInt(c, 10));
  if (ds.some((n) => Number.isNaN(n))) return false;
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += ds[i] * weights[i];
  sum += Math.floor((ds[8] * 5) / 10);
  const check = (10 - (sum % 10)) % 10;
  return check === ds[9];
}

/**
 * 사업자등록번호 표준 표기로 정규화 (123-45-67890). 잘못된 입력은 그대로 반환.
 */
export function formatKoreanBusinessNumber(input: string): string {
  const d = input.replace(/\D/g, "");
  if (d.length !== 10) return input;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

/**
 * 4단계 고객 정보 폼 Zod 스키마. RHF + zodResolver 와 결합해 사용.
 *
 * 필드 분류:
 *   필수 — company / name / email / phone
 *   선택 — businessNumber(검증), address, position, message
 */
export const customerSchema = z.object({
  company: z
    .string()
    .trim()
    .min(1, "needCompany")
    .max(200, "tooLongCompany"),
  name: z
    .string()
    .trim()
    .min(1, "needName")
    .max(80, "tooLongName"),
  email: z
    .string()
    .trim()
    .min(1, "needEmail")
    .email("needValidEmail"),
  phone: z
    .string()
    .trim()
    .min(1, "needPhone")
    .regex(PHONE_RE, "needValidPhone"),
  businessNumber: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined))
    .refine(
      (v) => v == null || isValidKoreanBusinessNumber(v),
      { message: "needValidBusinessNumber" },
    ),
  address: z
    .string()
    .max(300, "tooLongAddress")
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
  position: z
    .string()
    .max(100, "tooLongPosition")
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
  message: z
    .string()
    .max(2000, "tooLongMessage")
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
});

export type QuoteCustomerFormValues = z.input<typeof customerSchema>;
export type QuoteCustomerFormParsed = z.output<typeof customerSchema>;

/** 폼 에러 메시지 키 → next-intl 메시지로 매핑하기 위한 union. */
export type QuoteCustomerErrorKey =
  | "needCompany"
  | "tooLongCompany"
  | "needName"
  | "tooLongName"
  | "needEmail"
  | "needValidEmail"
  | "needPhone"
  | "needValidPhone"
  | "needValidBusinessNumber"
  | "tooLongAddress"
  | "tooLongPosition"
  | "tooLongMessage";
