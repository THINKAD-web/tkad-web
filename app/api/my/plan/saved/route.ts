import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/user-session";
import {
  getPrismaForSavedPlanCart,
  SavedPlanCartUnavailableError,
  savedPlanCartUnavailableMessage,
} from "@/lib/saved-plan-cart/prisma-access";
import { apiError, apiOk, apiServerError, apiZodError } from "@/lib/api-response";
import type { PlanCartItem } from "@/lib/plan-cart";
import {
  defaultSavedPlanTitle,
  type SavedPlanCartListItem,
  type SavedPlanCartReportSummary,
  type SavedPlanCartSource,
  type SavedPlanPublishIntent,
} from "@/lib/saved-plan-cart/types";
import { normalizePlanCartItemsForSave } from "@/lib/saved-plan-cart/normalize-items";

const GOAL_TITLES_KO: Record<string, string> = {
  brand: "브랜드 인지도",
  launch: "신제품 론칭",
  event: "이벤트·프로모션",
  sales: "전환·판매",
  local: "지역 마케팅",
};

const GOAL_TITLES_EN: Record<string, string> = {
  brand: "Brand awareness",
  launch: "Product launch",
  event: "Event promotion",
  sales: "Conversion",
  local: "Local marketing",
};

function resolveGoalTitle(campaignGoal: string | undefined, isKo: boolean): string | null {
  if (!campaignGoal) return null;
  const map = isKo ? GOAL_TITLES_KO : GOAL_TITLES_EN;
  return map[campaignGoal] ?? campaignGoal;
}

function resolveRegionsText(items: PlanCartItem[]): string | null {
  const keys = [...new Set(items.map((i) => i.region).filter(Boolean))];
  if (keys.length === 0) return null;
  return keys.slice(0, 8).join(", ");
}

export const dynamic = "force-dynamic";

const MAX_SAVED_PLANS = 50;

const PlanCartItemSchema = z.object({
  mediaId: z.string().min(1),
  mediaName: z.string(),
  mediaType: z.string(),
  region: z.string(),
  price: z.number(),
  thumbnailUrl: z.string().optional(),
  addedFrom: z.enum(["ai_recommend", "planner", "search", "map", "package"]),
  addedAt: z.string(),
});

const SaveBodySchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  source: z.enum(["plan_cart", "plan_report"]).optional(),
  items: z.array(PlanCartItemSchema).min(1),
  campaignGoal: z.string().optional(),
  totalBudget: z.number().int().nonnegative().optional(),
  duration: z.number().int().positive().optional(),
  updatedAt: z.string().optional(),
  reportSummary: z
    .object({
      goalTitle: z.string().optional(),
      regionsText: z.string().optional(),
      categoriesText: z.string().optional(),
      mediaCount: z.number().optional(),
      budgetMan: z.number().optional(),
      months: z.number().optional(),
      regionalBreakdown: z
        .array(
          z.object({
            regionKey: z.string(),
            label: z.string(),
            mediaCount: z.number(),
            budgetPct: z.number(),
          }),
        )
        .optional(),
    })
    .optional(),
});

function rowToListItem(row: {
  id: string;
  title: string;
  description: string | null;
  source: string;
  mediaCount: number;
  regionsText: string | null;
  goalTitle: string | null;
  publishIntent: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SavedPlanCartListItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    source: row.source as SavedPlanCartSource,
    mediaCount: row.mediaCount,
    regionsText: row.regionsText,
    goalTitle: row.goalTitle,
    publishIntent: row.publishIntent as SavedPlanPublishIntent | null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, { message: "로그인이 필요합니다." });
    }

    const db = getPrismaForSavedPlanCart();
    const rows = await db.savedPlanCart.findMany({
      where: { userId: user.id, deletedAt: null, status: "saved" },
      orderBy: { createdAt: "desc" },
      take: MAX_SAVED_PLANS,
      select: {
        id: true,
        title: true,
        description: true,
        source: true,
        mediaCount: true,
        regionsText: true,
        goalTitle: true,
        publishIntent: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return apiOk({ items: rows.map(rowToListItem) });
  } catch (e) {
    if (e instanceof SavedPlanCartUnavailableError) {
      return apiError("SERVER_ERROR", 503, {
        message: savedPlanCartUnavailableMessage(true),
      });
    }
    return apiServerError(e, "my/plan/saved");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, { message: "로그인이 필요합니다." });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("INVALID_JSON", 400);
    }

    const rawBody =
      body && typeof body === "object"
        ? {
            ...(body as Record<string, unknown>),
            items: normalizePlanCartItemsForSave(
              (body as Record<string, unknown>).items,
            ),
          }
        : body;

    const parsed = SaveBodySchema.safeParse(rawBody);
    if (!parsed.success) return apiZodError(parsed.error);

    const isKo = request.nextUrl.searchParams.get("locale") !== "en";
    const db = getPrismaForSavedPlanCart();
    const activeCount = await db.savedPlanCart.count({
      where: { userId: user.id, deletedAt: null, status: "saved" },
    });
    if (activeCount >= MAX_SAVED_PLANS) {
      return apiError("LIMIT_REACHED", 400, {
        message: `저장 플랜은 최대 ${MAX_SAVED_PLANS}개까지 가능합니다.`,
      });
    }

    const data = parsed.data;
    const reportSummary = data.reportSummary as SavedPlanCartReportSummary | undefined;
    const goalTitle =
      reportSummary?.goalTitle ??
      resolveGoalTitle(data.campaignGoal, isKo);
    const regionsText =
      reportSummary?.regionsText ?? resolveRegionsText(data.items as PlanCartItem[]);
    const title =
      data.title?.trim() ||
      defaultSavedPlanTitle(
        {
          items: data.items as PlanCartItem[],
          campaignGoal: data.campaignGoal,
          totalBudget: data.totalBudget,
          duration: data.duration,
          updatedAt: data.updatedAt ?? new Date().toISOString(),
        },
        isKo,
      );

    const created = await db.savedPlanCart.create({
      data: {
        userId: user.id,
        title,
        description: data.description?.trim() || null,
        source: data.source ?? "plan_cart",
        items: data.items as unknown as object,
        campaignGoal: data.campaignGoal ?? null,
        totalBudget: data.totalBudget ?? null,
        duration: data.duration ?? null,
        reportSummary: reportSummary
          ? (reportSummary as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        mediaCount: data.items.length,
        regionsText: regionsText?.slice(0, 500) ?? null,
        goalTitle: goalTitle?.slice(0, 120) ?? null,
        status: "saved",
      },
      select: {
        id: true,
        title: true,
        description: true,
        source: true,
        mediaCount: true,
        regionsText: true,
        goalTitle: true,
        publishIntent: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return apiOk(rowToListItem(created), { status: 201 });
  } catch (e) {
    if (e instanceof SavedPlanCartUnavailableError) {
      const isKo = request.nextUrl.searchParams.get("locale") !== "en";
      return apiError("SERVER_ERROR", 503, {
        message: savedPlanCartUnavailableMessage(isKo),
      });
    }
    return apiServerError(e, "my/plan/saved");
  }
}
