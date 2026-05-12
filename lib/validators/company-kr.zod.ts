import { z } from "zod";
import { isValidKoreanBusinessRegNo } from "@/lib/kr-business-reg-no";

/**
 * 사업자등록번호(선택 필드) — 비어 있으면 통과, 값이 있으면 체크섬 검증.
 * RHF: `zodResolver(z.object({ businessRegNo: zKoreanBusinessRegNoLoose, ... }))`
 */
export const zKoreanBusinessRegNoLoose = z
  .string()
  .trim()
  .refine(
    (s) => s.length === 0 || isValidKoreanBusinessRegNo(s),
    { message: "invalid business registration number" },
  );
