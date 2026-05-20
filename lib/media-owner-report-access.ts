import type { ReportAccessLevel } from "@prisma/client";
import { getUserReportLevel, rankLevel } from "@/lib/report-access";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const FREE_OWNER_DOWNLOADS_PER_MONTH = 3;

export type MediaOwnerWhitelabelMode = "default" | "pro" | "enterprise";

export type MediaOwnerReportAccess = {
  tier: ReportAccessLevel;
  whitelabel: MediaOwnerWhitelabelMode;
  watermark: boolean;
  unlimitedDownloads: boolean;
  downloadsUsedThisMonth: number;
  downloadsRemaining: number | null;
};

function whitelabelFromTier(tier: ReportAccessLevel): MediaOwnerWhitelabelMode {
  if (tier === "ENTERPRISE") return "enterprise";
  if (tier === "PRO") return "pro";
  return "default";
}

export async function getDownloadsThisMonth(ownerUserId: string): Promise<number> {
  if (!isDatabaseConfigured()) return 0;
  const db = getPrisma();
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return db.mediaOwnerReportDownload.count({
    where: { ownerUserId, createdAt: { gte: start } },
  });
}

export async function getMediaOwnerReportAccess(
  ownerUserId: string,
): Promise<MediaOwnerReportAccess> {
  const tier = await getUserReportLevel(ownerUserId);
  const unlimited = rankLevel(tier) >= rankLevel("PRO");
  const used = await getDownloadsThisMonth(ownerUserId);
  const whitelabel = whitelabelFromTier(tier);

  return {
    tier,
    whitelabel,
    watermark: whitelabel === "default",
    unlimitedDownloads: unlimited,
    downloadsUsedThisMonth: used,
    downloadsRemaining: unlimited
      ? null
      : Math.max(0, FREE_OWNER_DOWNLOADS_PER_MONTH - used),
  };
}

export async function assertCanDownloadReport(
  ownerUserId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const access = await getMediaOwnerReportAccess(ownerUserId);
  if (access.unlimitedDownloads) return { ok: true };
  if ((access.downloadsRemaining ?? 0) <= 0) {
    return {
      ok: false,
      message: `무료 플랜은 월 ${FREE_OWNER_DOWNLOADS_PER_MONTH}회까지 다운로드할 수 있습니다. PRO로 업그레이드하세요.`,
    };
  }
  return { ok: true };
}

export async function recordMediaOwnerReportDownload(
  ownerUserId: string,
  mediaId: string | null,
  reportType: "SPEC_SHEET" | "MONTHLY" | "ANNUAL" | "CATALOG",
): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const db = getPrisma();
  await db.mediaOwnerReportDownload.create({
    data: { ownerUserId, mediaId, reportType },
  });
}

/** 연간 보고서 — 12월에만 활성화 */
export function isAnnualReportAvailable(now = new Date()): boolean {
  return now.getMonth() === 11;
}

export function specSheetFilename(mediaName: string, date = new Date()): string {
  const d = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `${sanitizeFilename(mediaName)}_매체스펙시트_${d}.pdf`;
}

export function monthlyReportFilename(mediaName: string, month: string): string {
  const yyyymm = month.replace("-", "");
  return `${sanitizeFilename(mediaName)}_월간성과_${yyyymm}.pdf`;
}

export function annualReportFilename(mediaName: string, year: number): string {
  return `${sanitizeFilename(mediaName)}_연간보고서_${year}.pdf`;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "_").slice(0, 40);
}
