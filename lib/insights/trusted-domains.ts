/**
 * Tavily 검색 결과 필터용 도메인 화이트리스트.
 * - A 등급: 광고/마케팅 산업지·통계기관 (1순위 인용)
 * - B 등급: 종합지·기업 블로그 (2순위)
 * - C 등급: 군데군데 신뢰할 만한 보조 출처
 *
 * 운영팀 추가 요청 시 PR 로 직접 수정.
 * 현재는 정적 배열 — DB 화 / 어드민 UI 는 트래픽 보고 결정.
 */

export type DomainGrade = "A" | "B" | "C";

export const TRUSTED_DOMAINS: Record<string, DomainGrade> = {
  // 글로벌 광고/마케팅 산업지
  "adweek.com": "A",
  "campaignlive.com": "A",
  "campaignasia.com": "A",
  "marketingweek.com": "A",
  "thedrum.com": "A",
  "adage.com": "A",
  "warc.com": "A",
  "marketingdive.com": "A",
  "digiday.com": "A",
  "mediapost.com": "A",
  "exchangewire.com": "B",
  "marketingbrew.com": "B",
  "broadsign.com": "B", // DOOH SaaS 인사이트
  "vistarmedia.com": "B",

  // 통계/리서치
  "nielsen.com": "A",
  "kantar.com": "A",
  "statista.com": "A",
  "emarketer.com": "A",
  "insiderintelligence.com": "A",
  "magnaglobal.com": "A",
  "gartner.com": "A",

  // 한국 광고/마케팅
  "adic.or.kr": "A", // 한국방송광고진흥공사
  "kobaco.co.kr": "A",
  "the-pr.co.kr": "A",
  "brandbrief.co.kr": "B",
  "adlatina.com": "B",
  "aving.net": "B",
  "ad.co.kr": "B",
  "media-everse.com": "C",

  // 한국 종합 (신뢰도 높은 곳만)
  "yna.co.kr": "B",
  "yonhapnews.co.kr": "B",
  "mk.co.kr": "B",
  "hankyung.com": "B",
  "etnews.com": "B",
  "zdnet.co.kr": "B",
  "ddaily.co.kr": "B",
  "techm.kr": "B",

  // OOH/DOOH 협회·표준
  "oaaa.org": "A", // Out of Home Advertising Association of America
  "oma.org.au": "A",
  "doohhub.com": "B",
  "wooh.com": "B",
};

export function trustedDomainGrade(domain: string): DomainGrade | null {
  const norm = domain.toLowerCase().replace(/^www\./, "");
  if (TRUSTED_DOMAINS[norm]) return TRUSTED_DOMAINS[norm];
  // sub-도메인도 매칭 (예: research.nielsen.com → nielsen.com)
  for (const root of Object.keys(TRUSTED_DOMAINS)) {
    if (norm.endsWith(`.${root}`)) return TRUSTED_DOMAINS[root];
  }
  return null;
}

export function isTrustedDomain(domain: string): boolean {
  return trustedDomainGrade(domain) !== null;
}
