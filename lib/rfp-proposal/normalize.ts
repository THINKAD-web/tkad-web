import {
  rfpProposalBriefSchema,
  type RfpCampaignMeta,
  type RfpGroup,
  type RfpProposalBrief,
} from "@/lib/rfp-proposal/types";

function slugId(label: string, index: number): string {
  const base = label
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || `group-${index + 1}`;
}

function cleanStrings(arr: unknown, max: number, itemMax: number): string[] {
  if (!Array.isArray(arr)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of arr) {
    if (typeof item !== "string") continue;
    const t = item.trim().slice(0, itemMax);
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

function cleanNullableString(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t || null;
}

function normalizeGroup(raw: unknown, index: number): RfpGroup | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const label = cleanNullableString(o.label, 120);
  if (!label) return null;
  const idRaw = cleanNullableString(o.id, 64);
  return {
    id: idRaw || slugId(label, index),
    label,
    regionKeywords: cleanStrings(o.regionKeywords, 40, 80),
    mediaTypeKeywords: cleanStrings(o.mediaTypeKeywords, 40, 80),
    budget: cleanNullableString(o.budget, 200),
    period: cleanNullableString(o.period, 200),
    constraints: cleanStrings(o.constraints, 30, 400),
    packageHints: cleanStrings(o.packageHints, 30, 400),
  };
}

function normalizeCampaign(raw: unknown): RfpCampaignMeta | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const campaign: RfpCampaignMeta = {
    brandName: cleanNullableString(o.brandName, 160),
    target: cleanNullableString(o.target, 400),
    period: cleanNullableString(o.period, 200),
    industry: cleanNullableString(o.industry, 160),
    notes: cleanStrings(o.notes, 20, 400),
  };
  const hasAny =
    campaign.brandName ||
    campaign.target ||
    campaign.period ||
    campaign.industry ||
    (campaign.notes && campaign.notes.length > 0);
  return hasAny ? campaign : undefined;
}

/**
 * LLM tool 원본 → Zod 검증된 RfpProposalBrief.
 * 실패 시 null.
 */
export function normalizeRfpProposalBrief(raw: unknown): RfpProposalBrief | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const groupsRaw = Array.isArray(o.groups) ? o.groups : [];
  const groups = groupsRaw
    .map((g, i) => normalizeGroup(g, i))
    .filter((g): g is RfpGroup => !!g);
  if (groups.length === 0) return null;

  // id 충돌 해소
  const seen = new Set<string>();
  for (let i = 0; i < groups.length; i++) {
    let id = groups[i]!.id;
    if (seen.has(id)) id = `${id}-${i + 1}`;
    seen.add(id);
    groups[i] = { ...groups[i]!, id };
  }

  const candidate: RfpProposalBrief = {
    groups,
    campaign: normalizeCampaign(o.campaign),
  };
  const parsed = rfpProposalBriefSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
