import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { createCommunityPost } from "@/lib/community/queries";
import { handleCommunityPostCreated } from "@/lib/community/post-handlers";
import { planCartMonthlyTotal, type PlanCartItem } from "@/lib/plan-cart";
import type {
  SavedPlanCartReportSummary,
  SavedPlanPublishIntent,
} from "@/lib/saved-plan-cart/types";
import type { AdminSavedPlanDetail } from "@/lib/saved-plan-cart/admin-queries";

export type PromoteTarget = "case" | "community";

export type PromoteSavedPlanResult =
  | { ok: true; target: "case"; successCaseId: string }
  | { ok: true; target: "community"; communityPostId: string };

type PlanUser = AdminSavedPlanDetail["user"] & {
  phone?: string | null;
  role?: string;
  region?: string | null;
  createdAt?: string;
  lastLoginAt?: string | null;
};

function normalizeItems(raw: unknown): PlanCartItem[] {
  if (!Array.isArray(raw)) return [];
  return raw as PlanCartItem[];
}

function resolveCommunityRegion(
  regionsText: string | null,
  items: PlanCartItem[],
): string {
  const hay = `${regionsText ?? ""} ${items.map((i) => `${i.region} ${i.mediaName}`).join(" ")}`.toLowerCase();
  if (/부산|busan|해운대|서면|센텀/.test(hay)) return "busan";
  if (/제주|jeju/.test(hay)) return "jeju";
  if (/강남|테헤란|gangnam/.test(hay)) return "seoul_gangnam";
  if (/홍대|마포|hongdae|mapo/.test(hay)) return "seoul_hongdae";
  if (/서울|seoul/.test(hay)) return "seoul";
  if (items.length >= 3) return "national";
  return "national";
}

function periodBudgetWon(
  items: PlanCartItem[],
  totalBudget: number | null,
  duration: number | null,
): number {
  const monthly =
    totalBudget && totalBudget > 0
      ? totalBudget
      : planCartMonthlyTotal({ items, updatedAt: new Date().toISOString() });
  const months = duration && duration > 0 ? duration : 1;
  return Math.max(10_000_000, Math.round(monthly * months));
}

function mediaTypeLabels(items: PlanCartItem[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const label = item.mediaType?.trim() || "OOH";
    if (!seen.has(label)) {
      seen.add(label);
      out.push(label);
    }
  }
  return out.length ? out : ["OOH"];
}

function buildChallengeKo(detail: {
  goalTitle: string | null;
  regionsText: string | null;
  duration: number | null;
  user: PlanUser;
}): string {
  const goal = detail.goalTitle ?? "브랜드 인지도";
  const region = detail.regionsText ?? "주요 타깃 지역";
  const duration = detail.duration ? `${detail.duration}개월` : "단기";
  const who = detail.user.company?.trim() || detail.user.name;
  return `${who}는 ${region}을 중심으로 ${goal} 달성이 필요했습니다. 예산과 기간(${duration}) 안에서 효과적인 매체 믹스를 구성해야 했습니다.`;
}

function buildSolutionKo(items: PlanCartItem[], report: SavedPlanCartReportSummary | null): string {
  const lines = items.map(
    (m, i) => `${i + 1}. ${m.mediaName} (${m.mediaType}, ${m.region})`,
  );
  let text = `TKAD 플래너로 선정한 매체 포트폴리오:\n${lines.join("\n")}`;
  if (report?.regionalBreakdown?.length) {
    text += `\n\n지역별 구성:\n${report.regionalBreakdown
      .map((r) => `- ${r.label}: ${r.mediaCount}개 (예산 ${r.budgetPct}%)`)
      .join("\n")}`;
  }
  return text;
}

function buildResultsKo(
  report: SavedPlanCartReportSummary | null,
  budgetWon: number,
  duration: number | null,
): string[] {
  const results: string[] = [];
  if (report?.mediaCount) {
    results.push(`총 ${report.mediaCount}개 매체로 캠페인 포트폴리오 구성`);
  }
  if (budgetWon > 0) {
    const man = Math.round(budgetWon / 10_000);
    results.push(`기간 총 예산 약 ${man.toLocaleString("ko-KR")}만원 규모`);
  }
  if (duration) {
    results.push(`${duration}개월 집행 기준 플랜`);
  }
  if (report?.categoriesText) {
    results.push(`매체 유형: ${report.categoriesText}`);
  }
  if (results.length === 0) {
    results.push("플래너 기반 매체 믹스로 캠페인 실행 계획 수립");
  }
  return results;
}

function buildCommunityBody(detail: {
  title: string;
  description: string | null;
  goalTitle: string | null;
  regionsText: string | null;
  duration: number | null;
  items: PlanCartItem[];
  reportSummary: SavedPlanCartReportSummary | null;
  budgetWon: number;
}): string {
  const parts: string[] = [];
  parts.push(`저장한 플랜 「${detail.title}」을 공유합니다.`);
  if (detail.goalTitle) parts.push(`\n**캠페인 목표:** ${detail.goalTitle}`);
  if (detail.regionsText) parts.push(`**타깃 지역:** ${detail.regionsText}`);
  if (detail.duration) parts.push(`**집행 기간:** ${detail.duration}개월`);
  const man = Math.round(detail.budgetWon / 10_000);
  parts.push(`**기간 총 예산:** 약 ${man.toLocaleString("ko-KR")}만원`);
  if (detail.description?.trim()) {
    parts.push(`\n${detail.description.trim()}`);
  }
  parts.push(`\n**선정 매체 (${detail.items.length}개)**`);
  for (const m of detail.items) {
    parts.push(`- ${m.mediaName} · ${m.mediaType} · ${m.region}`);
  }
  if (detail.reportSummary?.regionalBreakdown?.length) {
    parts.push("\n**지역별 비중**");
    for (const r of detail.reportSummary.regionalBreakdown) {
      parts.push(`- ${r.label}: ${r.mediaCount}개 (${r.budgetPct}%)`);
    }
  }
  parts.push("\n*TKAD 플래너로 구성한 매체 믹스입니다. 운영팀 검토 후 반영될 수 있습니다.*");
  return parts.join("\n");
}

export async function promoteSavedPlanCart(args: {
  detail: AdminSavedPlanDetail;
  target: PromoteTarget;
  publishCommunity?: boolean;
}): Promise<PromoteSavedPlanResult> {
  const { detail, target } = args;
  const db = getPrisma();
  const items = normalizeItems(detail.items);
  if (items.length === 0) {
    throw new Error("매체가 없는 플랜은 승격할 수 없습니다.");
  }

  if (target === "case") {
    if (detail.promotedSuccessCaseId) {
      return { ok: true, target: "case", successCaseId: detail.promotedSuccessCaseId };
    }

    const budgetWon = periodBudgetWon(items, detail.totalBudget, detail.duration);
    const mediaIds = items.map((i) => i.mediaId).filter(Boolean);
    const mediaUsed = mediaTypeLabels(items);
    const report = detail.reportSummary;
    const clientName = detail.user.company?.trim() || detail.user.name;
    const industry = "기타";
    const thumbnailUrl =
      items.find((i) => i.thumbnailUrl)?.thumbnailUrl ?? null;

    const successCase = await db.successCase.create({
      data: {
        campaignId: null,
        status: "draft",
        clientName,
        industry,
        titleKo: detail.title,
        titleEn: null,
        summaryKo:
          detail.description?.trim() ||
          `${detail.goalTitle ?? "캠페인"} · ${detail.regionsText ?? "다지역"} · 매체 ${items.length}개`,
        challengeKo: buildChallengeKo({
          goalTitle: detail.goalTitle,
          regionsText: detail.regionsText,
          duration: detail.duration,
          user: detail.user,
        }),
        solutionKo: buildSolutionKo(items, report),
        resultsKo: buildResultsKo(report, budgetWon, detail.duration),
        metricsJson: {
          savedPlanCartId: detail.id,
          authorUserId: detail.user.id,
          authorEmail: detail.user.email,
          campaignGoal: detail.campaignGoal,
          goalTitle: detail.goalTitle,
          totalBudgetWon: budgetWon,
          durationMonths: detail.duration,
          mediaCount: items.length,
          regionsText: detail.regionsText,
          regionalBreakdown: report?.regionalBreakdown ?? null,
        } as Prisma.InputJsonValue,
        mediaUsed,
        mediaIds,
        periodStart: null,
        periodEnd: null,
        thumbnailUrl,
        galleryUrls: thumbnailUrl ? [thumbnailUrl] : [],
        testimonialKo: null,
        publishedAt: null,
      },
    });

    await db.savedPlanCart.update({
      where: { id: detail.id },
      data: {
        promotedSuccessCaseId: successCase.id,
        promotedAt: new Date(),
        publishIntent: detail.publishIntent ?? ("case" as SavedPlanPublishIntent),
        adminNote: detail.adminNote
          ? `${detail.adminNote}\n\n[사례 초안 생성 ${new Date().toISOString()}]`
          : `[사례 초안 생성 ${new Date().toISOString()}]`,
      },
    });

    return { ok: true, target: "case", successCaseId: successCase.id };
  }

  if (detail.promotedCommunityPostId) {
    return {
      ok: true,
      target: "community",
      communityPostId: detail.promotedCommunityPostId,
    };
  }

  const budgetWon = periodBudgetWon(items, detail.totalBudget, detail.duration);
  const region = resolveCommunityRegion(detail.regionsText, items);
  const body = buildCommunityBody({
    title: detail.title,
    description: detail.description,
    goalTitle: detail.goalTitle,
    regionsText: detail.regionsText,
    duration: detail.duration,
    items,
    reportSummary: detail.reportSummary,
    budgetWon,
  });

  const created = await createCommunityPost({
    category: "media_recommend",
    title: detail.title.slice(0, 200),
    body,
    authorName: detail.user.name,
    authorEmail: detail.user.email,
    authorUserId: detail.user.id,
    authorIp: null,
    metadata: {
      budgetWon,
      region,
      industry: "indOther",
      savedPlanCartId: detail.id,
      mediaIds: items.map((i) => i.mediaId),
      goalTitle: detail.goalTitle,
      durationMonths: detail.duration,
      source: "saved_plan_cart",
    },
    isPinned: false,
  });

  if (args.publishCommunity !== false) {
    await db.communityPost.update({
      where: { id: created.id },
      data: { status: "published" },
    });
  } else {
    await db.communityPost.update({
      where: { id: created.id },
      data: { status: "hidden" },
    });
  }

  await handleCommunityPostCreated({
    postId: created.id,
    category: "media_recommend",
    title: detail.title,
    body,
    metadata: {
      budgetWon,
      region,
      industry: "indOther",
    },
    authorUserId: detail.user.id,
    authorName: detail.user.name,
    locale: "ko",
  });

  await db.savedPlanCart.update({
    where: { id: detail.id },
    data: {
      promotedCommunityPostId: created.id,
      promotedAt: new Date(),
      publishIntent:
        detail.publishIntent ?? ("community" as SavedPlanPublishIntent),
      adminNote: detail.adminNote
        ? `${detail.adminNote}\n\n[커뮤니티 글 생성 ${new Date().toISOString()}]`
        : `[커뮤니티 글 생성 ${new Date().toISOString()}]`,
    },
  });

  return { ok: true, target: "community", communityPostId: created.id };
}
