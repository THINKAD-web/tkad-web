/**
 * CampaignPlan CRUD — Prisma `campaign_plans` 테이블.
 */

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  defaultExpiresAt,
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
    mediaMix: row.mediaMix as SavedCampaignPlan["mediaMix"],
    metrics: row.metrics as SavedCampaignPlan["metrics"],
    engineVersion: row.engineVersion,
    reportCopy: unpacked.reportCopy,
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
    mediaMix: row.mediaMix as SavedCampaignPlan["mediaMix"],
    metrics: row.metrics as SavedCampaignPlan["metrics"],
    engineVersion: row.engineVersion,
    reportCopy: unpacked.reportCopy,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
  };
}
