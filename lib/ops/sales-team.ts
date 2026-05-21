export type SalesRep = {
  email: string;
  name: string;
  /** 업종 코드 — 비어 있으면 일반 담당 */
  industries?: string[];
};

const DEFAULT_TEAM: SalesRep[] = [
  { email: "sales@tkad.co.kr", name: "THINKAD Sales" },
];

/** SALES_TEAM_JSON=[{"email":"a@tkad.co.kr","name":"김OO","industries":["beauty_fashion"]}] */
export function loadSalesTeam(): SalesRep[] {
  const raw = process.env.SALES_TEAM_JSON?.trim();
  if (!raw) return DEFAULT_TEAM;
  try {
    const parsed = JSON.parse(raw) as SalesRep[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_TEAM;
    return parsed.filter((r) => r.email?.includes("@"));
  } catch {
    return DEFAULT_TEAM;
  }
}
