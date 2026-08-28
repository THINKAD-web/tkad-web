import type { MediaItem } from "@/lib/media-data";
import {
  matchMediaCatalog,
  oneLineReason,
  type MatchedMedia,
  type MatchingInput,
} from "@/lib/matching-engine";
import { isNetworkCatalogItem } from "@/lib/matching-network-helpers";
import { mediaMonthlyPriceWon } from "@/lib/media-price-transparency";
import { fetchPublicMediaCatalogList } from "@/lib/public-media-catalog";
import {
  rfpGroupToMatchingInput,
  type RfpGroupToMatchingOpts,
} from "@/lib/rfp-proposal/rfp-group-to-matching";
import type { RfpProposalBrief } from "@/lib/rfp-proposal/types";

export const RFP_DEFAULT_LIMIT_PER_GROUP = 8;

/** API·UI용 직렬화 가능 매칭 행 */
export type RfpMatchedMediaSummary = {
  mediaId: string;
  name: string;
  nameEn: string;
  location: string;
  locationEn: string;
  priceWon: number;
  score: number;
  role: MatchedMedia["role"];
  oneLine: string;
  reasons: { ko: string; en: string }[];
  /** 오케스트레이터가 강제 포함(핀)한 항목 */
  pinned?: boolean;
};

export type RfpGroupMatchResult = {
  groupId: string;
  groupLabel: string;
  input: MatchingInput;
  mediaItems: RfpMatchedMediaSummary[];
};

export type RfpBriefMatchResult = {
  groups: RfpGroupMatchResult[];
  catalogCount: number;
};

export type MatchRfpProposalBriefOpts = {
  limitPerGroup?: number;
  excludeNetwork?: boolean;
  /** 전 그룹 공통 제외 매체 ID */
  excludedMediaIds?: readonly string[];
  /** groupId → 해당 그룹에서만 제외 */
  excludedByGroup?: Readonly<Record<string, readonly string[]>>;
  /** groupId → 강제 포함할 매체 ID (카탈로그에서 조회 후 앞에 핀) */
  includedByGroup?: Readonly<Record<string, readonly string[]>>;
  strictRegionalPool?: boolean;
  isKo?: boolean;
  seed?: number;
  /** 테스트용 — 주입 시 fetchPublicMediaCatalogList 생략 */
  catalog?: readonly MediaItem[];
  toMatchingOpts?: RfpGroupToMatchingOpts;
};

function toSummary(
  m: MatchedMedia,
  input: MatchingInput,
  isKo: boolean,
  pinned = false,
): RfpMatchedMediaSummary {
  return {
    mediaId: m.media.id,
    name: m.media.name,
    nameEn: m.media.nameEn,
    location: m.media.location,
    locationEn: m.media.locationEn,
    priceWon: mediaMonthlyPriceWon(m.media),
    score: m.score,
    role: m.role,
    oneLine: oneLineReason(m, input.industry, input.targets, isKo),
    reasons: m.reasons,
    ...(pinned ? { pinned: true } : {}),
  };
}

function syntheticMatched(media: MediaItem): MatchedMedia {
  return {
    media,
    score: 0,
    breakdown: {
      budget: 0,
      region: 0,
      industry: 0,
      target: 0,
      category: 0,
      popularity: 0,
      total: 0,
    },
    reasons: [
      {
        ko: "수동으로 추가한 매체",
        en: "Manually added media",
      },
    ],
    budgetAllocation: 0,
    role: "sub",
    priority: 99,
  };
}

function applyManualOverrides(
  matched: MatchedMedia[],
  catalogById: Map<string, MediaItem>,
  excluded: ReadonlySet<string>,
  includeIds: readonly string[] | undefined,
  limit: number,
): MatchedMedia[] {
  const excludedSet = excluded;
  let pool = matched.filter((m) => !excludedSet.has(m.media.id));

  const pinned: MatchedMedia[] = [];
  if (includeIds?.length) {
    for (const id of includeIds) {
      const trimmed = id.trim();
      if (!trimmed || excludedSet.has(trimmed)) continue;
      if (pool.some((m) => m.media.id === trimmed)) {
        const existing = pool.find((m) => m.media.id === trimmed)!;
        pinned.push(existing);
        pool = pool.filter((m) => m.media.id !== trimmed);
        continue;
      }
      const media = catalogById.get(trimmed);
      if (media) pinned.push(syntheticMatched(media));
    }
  }

  const merged = [...pinned, ...pool];
  // 중복 제거 (앞에 온 핀 우선)
  const seen = new Set<string>();
  const deduped: MatchedMedia[] = [];
  for (const m of merged) {
    if (seen.has(m.media.id)) continue;
    seen.add(m.media.id);
    deduped.push(m);
  }
  return deduped.slice(0, limit);
}

/**
 * RfpProposalBrief.groups 를 순회하며 matchMediaCatalog 을 그룹별 N회 호출.
 * 기존 matchMediaCatalog 로직은 변경하지 않는 오케스트레이션 레이어.
 */
export async function matchRfpProposalBrief(
  brief: RfpProposalBrief,
  opts?: MatchRfpProposalBriefOpts,
): Promise<RfpBriefMatchResult> {
  const limit = opts?.limitPerGroup ?? RFP_DEFAULT_LIMIT_PER_GROUP;
  const isKo = opts?.isKo !== false;
  const globalExcluded = new Set(
    (opts?.excludedMediaIds ?? []).map((id) => id.trim()).filter(Boolean),
  );

  const fullCatalog =
    opts?.catalog ?? (await fetchPublicMediaCatalogList());
  let catalog = fullCatalog.filter(
    (m) => m?.id && typeof m.id === "string" && m.id.trim().length > 0,
  );
  if (opts?.excludeNetwork) {
    catalog = catalog.filter((m) => !isNetworkCatalogItem(m));
  }

  const catalogById = new Map(catalog.map((m) => [m.id, m]));
  const groups: RfpGroupMatchResult[] = [];

  for (let i = 0; i < brief.groups.length; i++) {
    const group = brief.groups[i]!;
    const input = rfpGroupToMatchingInput(group, brief.campaign, {
      seed: (opts?.seed ?? 0) + i,
      ...opts?.toMatchingOpts,
    });

    const matched = matchMediaCatalog(catalog, input, limit, {
      strictRegionalPool: opts?.strictRegionalPool,
    });

    const excluded = new Set(globalExcluded);
    for (const id of opts?.excludedByGroup?.[group.id] ?? []) {
      const t = id.trim();
      if (t) excluded.add(t);
    }

    const includeIds = opts?.includedByGroup?.[group.id];
    const finalMatched = applyManualOverrides(
      matched,
      catalogById,
      excluded,
      includeIds,
      limit,
    );

    const pinnedIds = new Set(
      (includeIds ?? []).map((id) => id.trim()).filter(Boolean),
    );

    groups.push({
      groupId: group.id,
      groupLabel: group.label,
      input,
      mediaItems: finalMatched.map((m) =>
        toSummary(m, input, isKo, pinnedIds.has(m.media.id)),
      ),
    });
  }

  return {
    groups,
    catalogCount: catalog.length,
  };
}
