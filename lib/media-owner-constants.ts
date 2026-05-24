/** 매체사 정산 수수료 (15%) — 클라이언트·서버 공용 */
export const MEDIA_OWNER_FEE_RATE = 0.15;

export function calcNetFromGross(grossWon: number): {
  feeWon: number;
  netWon: number;
} {
  const feeWon = Math.round(grossWon * MEDIA_OWNER_FEE_RATE);
  return { feeWon, netWon: grossWon - feeWon };
}
