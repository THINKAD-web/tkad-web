import { normalizeRfpProposalBrief } from "@/lib/rfp-proposal/normalize";
import type { RfpProposalBrief } from "@/lib/rfp-proposal/types";

/**
 * 번호 섹션 헤더로 나뉜 한국어 RFP 장문용 규칙 기반 폴백.
 * Claude 불가/실패 시에도 ZHITAI류 구조를 재현 가능하게 유지.
 */

const SECTION_RE =
  /(?:^|\n)\s*(?:━+\s*\n\s*)?(\d+)\.\s*([^\n━]+?)\s*(?:\n\s*━+)?\s*\n([\s\S]*?)(?=(?:\n\s*━+\s*\n\s*\d+\.)|(?:\n\s*\d+\.\s)|(?:\n제출\s*형식)|(?:\n회신)|$)/gi;

const MEDIA_TYPE_HINTS = [
  "디지털 사이니지",
  "사이니지",
  "웨이파인딩",
  "DOOH",
  "스크린",
  "PSD",
  "스크린도어",
  "와이드칼라",
  "랜드마크",
] as const;

function uniq(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of arr) {
    const t = s.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function extractMediaTypes(body: string): string[] {
  const found: string[] = [];
  for (const hint of MEDIA_TYPE_HINTS) {
    if (body.includes(hint)) found.push(hint);
  }
  // "디지털 매체" 등 일반어
  if (/디지털\s*매체/.test(body) && !found.includes("디지털 매체")) {
    found.push("디지털 매체");
  }
  return found;
}

function extractRegionKeywords(label: string, body: string): string[] {
  const keywords: string[] = [];
  const labelCore = label.replace(/\s*권역\s*$/, "").trim();
  if (labelCore) keywords.push(labelCore);

  const patterns: RegExp[] = [
    /인천공항\s*T[12]/gi,
    /인천공항/gi,
    /제[12]여객터미널/g,
    /코엑스\s*K-?POP\s*광장/gi,
    /코엑스/gi,
    /K-?POP\s*광장/gi,
    /삼성역/g,
    /강남/g,
    /홍대/g,
    /서울역/g,
    /입국장/g,
    /게이트/g,
  ];
  for (const re of patterns) {
    const matches = body.match(re);
    if (matches) keywords.push(...matches.map((m) => m.replace(/\s+/g, " ").trim()));
  }

  // 불릿 라인에서 위치성 명사구 추출
  for (const line of body.split("\n")) {
    const t = line.replace(/^[-•*]\s*/, "").trim();
    if (!t || t.length > 80) continue;
    if (/(공항|코엑스|역사|강남|삼성|홍대|PSD|터미널|광장)/.test(t)) {
      // 너무 긴 문장은 앞 구간만
      const short = t.split(/[,(，]/)[0]!.trim().slice(0, 60);
      if (short.length >= 2) keywords.push(short);
    }
  }

  return uniq(keywords).slice(0, 40);
}

function extractConstraints(body: string): string[] {
  const out: string[] = [];
  for (const line of body.split("\n")) {
    const t = line.replace(/^[-•*]\s*/, "").trim();
    if (!t) continue;
    if (/(계약|TO|제작비|송출비|패키지|월\s*단위|분기|단가)/.test(t)) {
      out.push(t.slice(0, 400));
    }
  }
  return uniq(out).slice(0, 30);
}

function extractCampaignMeta(text: string): Record<string, unknown> {
  const brand =
    text.match(/브랜드\s*[:：]\s*([^\n]+)/)?.[1]?.trim() ||
    text.match(/ZHITAI/)?.[0] ||
    null;
  const target =
    text.match(/타겟\s*[:：]\s*([^\n]+)/)?.[1]?.trim() ||
    (/(IT|게이밍|테크)/.test(text)
      ? "IT / 게이밍 / 테크 소비층"
      : null);
  const period =
    text.match(/시기\s*[:：]\s*([^\n]+)/)?.[1]?.trim() ||
    text.match(/20\d{2}\s*년?\s*하반기/)?.[0] ||
    null;
  const industry =
    text.match(/업종\s*[:：]\s*([^\n]+)/)?.[1]?.trim() || null;
  const notes: string[] = [];
  const common = text.match(/공통\s*요청\s*[:：]\s*([^\n]+)/)?.[1]?.trim();
  if (common) notes.push(common);
  return { brandName: brand, target, period, industry, notes };
}

/**
 * 규칙 기반 RFP 그룹 추출. 실패 시 null.
 */
export function heuristicParseRfpBrief(text: string): RfpProposalBrief | null {
  const trimmed = text.trim();
  if (trimmed.length < 40) return null;

  const groups: Record<string, unknown>[] = [];
  const re = new RegExp(SECTION_RE.source, SECTION_RE.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(trimmed)) !== null) {
    const label = m[2]!.trim().replace(/\s+/g, " ");
    const body = m[3] ?? "";
    if (!label || body.trim().length < 8) continue;
    // "제출 형식" 등 비그룹 스킵
    if (/제출|회신|개요/.test(label)) continue;

    groups.push({
      id: `g-${m[1]}`,
      label,
      regionKeywords: extractRegionKeywords(label, body),
      mediaTypeKeywords: extractMediaTypes(body),
      budget: null,
      period: null,
      constraints: extractConstraints(body),
      packageHints: extractConstraints(body).filter((c) =>
        /패키지|컷\s*단위|역사\s*단위/.test(c),
      ),
    });
  }

  if (groups.length === 0) return null;

  return normalizeRfpProposalBrief({
    groups,
    campaign: extractCampaignMeta(trimmed),
  });
}
