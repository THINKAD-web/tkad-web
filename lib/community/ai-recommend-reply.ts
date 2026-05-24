import type { MediaItem } from "@/lib/media-data";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import {
  asMediaRecommendMetadata,
  normalizeIndustryKey,
  type CommunityPostMetadataInput,
} from "@/lib/community/post-metadata";
import { recommendPlannerMedia } from "@/lib/planner/recommend";
import type { PlannerMapRegion } from "@/lib/planner-logic";
import { createSystemCommunityComment } from "@/lib/community/queries";

const AI_AUTHOR = "THINKAD AI";
const OPS_AUTHOR = "THINKAD 매체팀";

function mediaMatchesRegion(media: MediaItem, region: string): boolean {
  const hay = `${media.location} ${media.district ?? ""} ${media.name}`.toLowerCase();
  const r = region.toLowerCase();
  if (r.includes("gangnam") || r === "seoul_gangnam") {
    return (
      hay.includes("강남") ||
      hay.includes("gangnam") ||
      hay.includes("테헤란") ||
      hay.includes("yeoksam") ||
      hay.includes("역삼")
    );
  }
  if (r.includes("hongdae") || r === "seoul_hongdae") {
    return (
      hay.includes("홍대") ||
      hay.includes("hongdae") ||
      hay.includes("마포") ||
      hay.includes("mapo") ||
      hay.includes("합정")
    );
  }
  if (r.startsWith("seoul")) {
    return hay.includes("서울") || hay.includes("seoul");
  }
  if (r.startsWith("busan")) {
    return hay.includes("부산") || hay.includes("busan");
  }
  if (r.startsWith("jeju")) {
    return hay.includes("제주") || hay.includes("jeju");
  }
  return true;
}

function toPlannerRegion(region: string): PlannerMapRegion {
  if (region.startsWith("busan")) return "busan";
  if (region.startsWith("jeju")) return "jeju";
  if (region === "national") return "national";
  return "seoul";
}

export async function createAiRecommendReply(opts: {
  postId: string;
  metadata: CommunityPostMetadataInput;
  locale: string;
}): Promise<void> {
  const meta = asMediaRecommendMetadata(opts.metadata);
  if (!meta) return;

  const isKo = opts.locale.toLowerCase().startsWith("ko");
  const catalog = await fetchPublicMediaCatalog();
  const regionFiltered = catalog.filter((m) =>
    mediaMatchesRegion(m, meta.region),
  );
  const pool = regionFiltered.length > 0 ? regionFiltered : catalog;

  const budgetMan = Math.max(50, Math.round(meta.budgetWon / 10_000));
  const industryKey = normalizeIndustryKey(meta.industry);
  const scored = recommendPlannerMedia(
    pool,
    {
      goal: "brand",
      regions: [toPlannerRegion(meta.region)],
      categories: ["digital", "static", "mobile"],
      ageKey: "ageAll",
      industryKey,
      budgetMan,
      months: 1,
    },
    3,
  );

  const picks = scored.length > 0 ? scored : pool.slice(0, 3).map((m) => ({ media: m, score: 0, reasons: [] }));

  const intro = isKo
    ? "조건에 맞는 추천 매체 3개입니다."
    : "Here are 3 media that match your criteria.";

  const lines = picks.slice(0, 3).map((s, i) => {
    const name = s.media.name;
    const path = `/${opts.locale}/media/${s.media.id}`;
    return isKo
      ? `${i + 1}. [${name}](${path}) — 월 약 ${Math.round(s.media.price / 10_000)}만원대`
      : `${i + 1}. [${name}](${path}) — ~₩${s.media.price.toLocaleString()}/mo`;
  });

  const body = [intro, "", ...lines].join("\n");

  await createSystemCommunityComment({
    postId: opts.postId,
    authorName: AI_AUTHOR,
    body,
  });

  await createSystemCommunityComment({
    postId: opts.postId,
    authorName: OPS_AUTHOR,
    body: isKo
      ? "추가 상담·견적이 필요하시면 문의하기 또는 견적 요청을 이용해 주세요. 담당자가 맞춤 제안을 드립니다."
      : "For a tailored quote, use Contact or Request a Quote — our team will follow up.",
  });
}
