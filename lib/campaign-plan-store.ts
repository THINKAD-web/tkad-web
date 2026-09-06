/**
 * CampaignPlan CRUD — Prisma `campaign_plans` 테이블.
 */

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  defaultExpiresAt,
  normalizeMediaMix,
  type CampaignPlanOnlineRecommendSnapshot,
  type CampaignPlanSnapshot,
  type CampaignPlanStoredMetrics,
} from "@/lib/campaign-plan-schema";
import {
  packCampaignPlanBriefJson,
  unpackCampaignPlanBriefJson,
} from "@/lib/campaign-plan-report-copy";
import type { PlannerReportCopyState } from "@/lib/planner-report-export/report-copy-state";

export type SavedCampaignPlan = {
  id: string;
  shareToken: string;
  brief: CampaignPlanSnapshot["brief"];
  mediaMix: CampaignPlanSnapshot["mediaMix"];
  metrics: CampaignPlanStoredMetrics;
  engineVersion: string;
  reportCopy?: PlannerReportCopyState | null;
  /** digital_only 플랜에만 존재 — 있으면 mediaMix는 항상 빈 배열 */
  onlineRecommend?: CampaignPlanOnlineRecommendSnapshot | null;
  createdAt: string;
  expiresAt: string | null;
};

function newShareToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function createCampaignPlan(params: {
  snapshot: CampaignPlanSnapshot;
  ownerId?: string | null;
}): Promise<SavedCampaignPlan> {
  const expiresAt = defaultExpiresAt();
  const row = await prisma.campaignPlan.create({
    data: {
      shareToken: newShareToken(),
      ownerId: params.ownerId ?? null,
      brief: packCampaignPlanBriefJson(
        params.snapshot.brief,
        params.snapshot.reportCopy,
        params.snapshot.onlineRecommend,
      ) as never,
      mediaMix: params.snapshot.mediaMix as never,
      metrics: params.snapshot.metrics as never,
      engineVersion: params.snapshot.engineVersion,
      expiresAt,
    },
    select: {
      id: true,
      shareToken: true,
      brief: true,
      mediaMix: true,
      metrics: true,
      engineVersion: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  const unpacked = unpackCampaignPlanBriefJson(row.brief);
  return {
    id: row.id,
    shareToken: row.shareToken,
    brief: unpacked.brief,
    mediaMix: normalizeMediaMix(row.mediaMix),
    metrics: row.metrics as SavedCampaignPlan["metrics"],
    engineVersion: row.engineVersion,
    reportCopy: unpacked.reportCopy,
    onlineRecommend: unpacked.onlineRecommend,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
  };
}

export async function getCampaignPlanById(
  id: string,
): Promise<SavedCampaignPlan | null> {
  const row = await prisma.campaignPlan.findUnique({
    where: { id },
    select: {
      id: true,
      shareToken: true,
      brief: true,
      mediaMix: true,
      metrics: true,
      engineVersion: true,
      createdAt: true,
      expiresAt: true,
    },
  });
  if (!row) return null;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;

  const unpacked = unpackCampaignPlanBriefJson(row.brief);
  return {
    id: row.id,
    shareToken: row.shareToken,
    brief: unpacked.brief,
    mediaMix: normalizeMediaMix(row.mediaMix),
    metrics: row.metrics as SavedCampaignPlan["metrics"],
    engineVersion: row.engineVersion,
    reportCopy: unpacked.reportCopy,
    onlineRecommend: unpacked.onlineRecommend,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
  };
}
