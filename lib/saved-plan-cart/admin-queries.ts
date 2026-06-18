import { getPrisma } from "@/lib/prisma";
import type { PlanCartItem } from "@/lib/plan-cart";
import type {
  SavedPlanCartReportSummary,
  SavedPlanPublishIntent,
} from "@/lib/saved-plan-cart/types";

export type AdminSavedPlanUser = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  role: string;
  region: string | null;
  createdAt: string;
  lastLoginAt: string | null;
};

export type AdminSavedPlanRow = {
  id: string;
  title: string;
  source: string;
  mediaCount: number;
  regionsText: string | null;
  goalTitle: string | null;
  campaignGoal: string | null;
  totalBudget: number | null;
  duration: number | null;
  status: string;
  publishIntent: SavedPlanPublishIntent | null;
  adminNote: string | null;
  promotedSuccessCaseId: string | null;
  promotedCommunityPostId: string | null;
  promotedAt: string | null;
  restoreCount: number;
  lastRestoredAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: AdminSavedPlanUser;
};

export type AdminSavedPlanDetail = AdminSavedPlanRow & {
  description: string | null;
  items: PlanCartItem[];
  reportSummary: SavedPlanCartReportSummary | null;
};

function mapUser(row: {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  role: string;
  region: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
}): AdminSavedPlanUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    company: row.company,
    phone: row.phone,
    role: row.role,
    region: row.region,
    createdAt: row.createdAt.toISOString(),
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
  };
}

function mapRow(row: {
  id: string;
  title: string;
  source: string;
  mediaCount: number;
  regionsText: string | null;
  goalTitle: string | null;
  campaignGoal: string | null;
  totalBudget: number | null;
  duration: number | null;
  status: string;
  publishIntent: string | null;
  adminNote: string | null;
  promotedSuccessCaseId: string | null;
  promotedCommunityPostId: string | null;
  promotedAt: Date | null;
  restoreCount: number;
  lastRestoredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    company: string | null;
    phone: string | null;
    role: string;
    region: string | null;
    createdAt: Date;
    lastLoginAt: Date | null;
  };
}): AdminSavedPlanRow {
  return {
    id: row.id,
    title: row.title,
    source: row.source,
    mediaCount: row.mediaCount,
    regionsText: row.regionsText,
    goalTitle: row.goalTitle,
    campaignGoal: row.campaignGoal,
    totalBudget: row.totalBudget,
    duration: row.duration,
    status: row.status,
    publishIntent: row.publishIntent as SavedPlanPublishIntent | null,
    adminNote: row.adminNote,
    promotedSuccessCaseId: row.promotedSuccessCaseId,
    promotedCommunityPostId: row.promotedCommunityPostId,
    promotedAt: row.promotedAt?.toISOString() ?? null,
    restoreCount: row.restoreCount,
    lastRestoredAt: row.lastRestoredAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    user: mapUser(row.user),
  };
}

const userSelect = {
  id: true,
  name: true,
  email: true,
  company: true,
  phone: true,
  role: true,
  region: true,
  createdAt: true,
  lastLoginAt: true,
} as const;

function normalizeItems(raw: unknown): PlanCartItem[] {
  if (!Array.isArray(raw)) return [];
  return raw as PlanCartItem[];
}

export async function listAdminSavedPlanCarts(args: {
  page: number;
  pageSize: number;
  status?: string;
  publishIntent?: string;
  userId?: string;
  q?: string;
}): Promise<{ items: AdminSavedPlanRow[]; total: number; page: number; pageSize: number }> {
  const db = getPrisma();
  const page = Math.max(1, args.page);
  const pageSize = Math.min(50, Math.max(1, args.pageSize));
  const skip = (page - 1) * pageSize;

  const where = {
    deletedAt: null as Date | null,
    ...(args.userId ? { userId: args.userId } : {}),
    ...(args.status && args.status !== "all" ? { status: args.status } : {}),
    ...(args.publishIntent === "__none__"
      ? { publishIntent: null }
      : args.publishIntent && args.publishIntent !== "all"
        ? { publishIntent: args.publishIntent }
        : {}),
    ...(args.q?.trim()
      ? {
          OR: [
            { title: { contains: args.q.trim(), mode: "insensitive" as const } },
            { regionsText: { contains: args.q.trim(), mode: "insensitive" as const } },
            {
              user: {
                OR: [
                  { name: { contains: args.q.trim(), mode: "insensitive" as const } },
                  { email: { contains: args.q.trim(), mode: "insensitive" as const } },
                ],
              },
            },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.savedPlanCart.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        title: true,
        source: true,
        mediaCount: true,
        regionsText: true,
        goalTitle: true,
        campaignGoal: true,
        totalBudget: true,
        duration: true,
        status: true,
        publishIntent: true,
        adminNote: true,
        promotedSuccessCaseId: true,
        promotedCommunityPostId: true,
        promotedAt: true,
        restoreCount: true,
        lastRestoredAt: true,
        createdAt: true,
        updatedAt: true,
        user: { select: userSelect },
      },
    }),
    db.savedPlanCart.count({ where }),
  ]);

  return {
    items: rows.map(mapRow),
    total,
    page,
    pageSize,
  };
}

export async function getAdminSavedPlanCart(
  id: string,
): Promise<AdminSavedPlanDetail | null> {
  const db = getPrisma();
  const row = await db.savedPlanCart.findFirst({
    where: { id, deletedAt: null },
    include: {
      user: { select: userSelect },
    },
  });
  if (!row) return null;

  return {
    ...mapRow(row),
    description: row.description,
    items: normalizeItems(row.items),
    reportSummary: row.reportSummary as SavedPlanCartReportSummary | null,
  };
}
