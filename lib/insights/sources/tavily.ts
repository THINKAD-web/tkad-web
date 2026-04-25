import { trustedDomainGrade } from "@/lib/insights/trusted-domains";
import type { WebSource } from "@/lib/insights/types";
import { pickKeywords } from "@/lib/insights/keyword-pool";

/**
 * Tavily Search API client (server-side only).
 * https://docs.tavily.com/api-reference/endpoint/search
 *
 * - API key 미설정·네트워크 장애 시 빈 배열 (cron 흐름 깨지 않음)
 * - 신뢰 도메인 화이트리스트 통과한 결과만 반환
 * - 7일 이내, search_depth=advanced (콘텐츠 본문 포함)
 */

const TAVILY_ENDPOINT = "https://api.tavily.com/search";

interface TavilyRawResult {
  title: string;
  url: string;
  content: string;
  score?: number;
  published_date?: string;
}

interface TavilyResponse {
  results?: TavilyRawResult[];
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

interface FetchOptions {
  /** 검색 키워드 (미지정 시 풀에서 5개 자동 선택) */
  keywords?: string[];
  /** 결과 갯수 상한 (default 8) */
  maxResults?: number;
  /** 최근 N일 (default 7) */
  days?: number;
  /** 신뢰 도메인 외 결과도 포함 (default false) */
  includeUntrusted?: boolean;
}

/**
 * 단일 키워드 검색.
 * Tavily 무료 한도(분당 60회) 보호 위해 직렬 호출.
 */
async function searchOne(
  apiKey: string,
  keyword: string,
  days: number,
  signal: AbortSignal,
): Promise<TavilyRawResult[]> {
  const res = await fetch(TAVILY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query: keyword,
      search_depth: "advanced",
      topic: "news",
      days,
      max_results: 5,
      include_answer: false,
      include_raw_content: false,
      include_images: false,
    }),
    signal,
  });
  if (!res.ok) {
    throw new Error(`Tavily ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as TavilyResponse;
  return Array.isArray(data.results) ? data.results : [];
}

/**
 * OOH 관련 웹 출처를 Tavily 로 수집.
 * 호출자(cron, admin)는 빈 배열을 graceful 처리해야 함.
 */
export async function fetchOOHWebSources(
  opts: FetchOptions = {},
): Promise<{ sources: WebSource[]; keywordsUsed: string[] }> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[tavily] TAVILY_API_KEY missing — skipping web search");
    return { sources: [], keywordsUsed: [] };
  }

  const keywords = opts.keywords ?? pickKeywords(5, "mixed");
  const days = opts.days ?? 7;
  const maxResults = opts.maxResults ?? 8;
  const includeUntrusted = opts.includeUntrusted ?? false;

  // 90초 타임아웃 (cron route 의 maxDuration 300 안에서 안전)
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);

  const aggregated: TavilyRawResult[] = [];
  try {
    for (const k of keywords) {
      try {
        const r = await searchOne(apiKey, k, days, controller.signal);
        aggregated.push(...r);
      } catch (e) {
        console.warn(
          `[tavily] keyword '${k}' failed:`,
          e instanceof Error ? e.message : e,
        );
      }
    }
  } finally {
    clearTimeout(timer);
  }

  // dedupe by URL, filter trust, sort by score
  const seen = new Set<string>();
  const filtered: WebSource[] = [];
  for (const r of aggregated) {
    if (!r.url || seen.has(r.url)) continue;
    seen.add(r.url);
    const domain = extractDomain(r.url);
    const grade = trustedDomainGrade(domain);
    if (!includeUntrusted && !grade) continue;
    filtered.push({
      title: r.title?.trim() ?? "",
      url: r.url,
      snippet: (r.content ?? "").trim().slice(0, 600),
      domain,
      publishedAt: r.published_date ?? null,
      trustGrade: grade,
      score: r.score,
    });
  }

  filtered.sort((a, b) => {
    // A > B > C, 같은 등급은 score desc
    const gradeWeight = (g: WebSource["trustGrade"]) =>
      g === "A" ? 3 : g === "B" ? 2 : g === "C" ? 1 : 0;
    const dg = gradeWeight(b.trustGrade) - gradeWeight(a.trustGrade);
    if (dg !== 0) return dg;
    return (b.score ?? 0) - (a.score ?? 0);
  });

  return {
    sources: filtered.slice(0, maxResults),
    keywordsUsed: keywords,
  };
}
