/**
 * 대한민국 사업자등록번호 10자리 검증 (세무서 공개 체크섬 규칙).
 * 하이픈/공백은 무시.
 */
export function isValidKoreanBusinessRegNo(input: string): boolean {
  const d = input.replace(/[-\s]/g, "");
  if (!/^\d{10}$/.test(d)) return false;
  const w = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(d[i]!, 10) * w[i]!;
  }
  sum += Math.floor((parseInt(d[8]!, 10) * 5) / 10);
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(d[9]!, 10);
}
