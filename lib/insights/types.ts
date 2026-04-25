/**
 * 인사이트 자동 발행 파이프라인의 공통 타입.
 * - WebSource: Tavily 검색 결과 정규화 형태
 * - InternalInsight: 자체 매체 DB 에서 추출한 통계
 * - GenerationContext: generator 에 주입되는 보강 자료
 */

export interface WebSource {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  /** ISO 날짜 또는 raw 문자열 (Tavily 가 종종 자유 형식 반환) */
  publishedAt?: string | null;
  /** 신뢰 도메인 등급 (없으면 미신뢰 — 기본 필터에서 배제됨) */
  trustGrade?: "A" | "B" | "C" | null;
  /** Tavily 점수 (0~1). 정렬용. */
  score?: number;
}

export interface InternalInsight {
  /** 사람이 읽을 수 있는 라벨 (DB `internal_data_used` 에 저장) */
  title: string;
  /** 사람이 읽을 수 있는 한 줄 요약 (LLM 입력용) */
  summary: string;
  /** 머신 친화적 raw 데이터 (미래 차트/그래프 활용) */
  raw?: Record<string, unknown>;
}

export interface GenerationContext {
  webSources: WebSource[];
  internalInsights: InternalInsight[];
  /** 검색에 실제로 사용된 키워드들 (재현성·디버깅) */
  keywordsUsed: string[];
}

/** generator 입력 비었을 때 phase 별 graceful 동작용 안전 기본값. */
export function emptyGenerationContext(): GenerationContext {
  return { webSources: [], internalInsights: [], keywordsUsed: [] };
}
