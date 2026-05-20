import { randomBytes } from "crypto";
import type { MediaOwnerReportType } from "@prisma/client";
import {
  assertCanDownloadReport,
  getMediaOwnerReportAccess,
  recordMediaOwnerReportDownload,
  specSheetFilename,
  monthlyReportFilename,
  annualReportFilename,
} from "@/lib/media-owner-report-access";
import {
  loadMediaOwnerReportPayload,
  loadOwnerMediaSummaries,
} from "@/lib/media-owner-report-data";
import {
  buildMediaOwnerCatalogPdf,
  buildMediaOwnerReportPdf,
  type BrandingProfile,
} from "@/lib/build-media-owner-report-pdf";
import { assertOwnsMedia } from "@/lib/media-owner-guard";
import { getPrisma } from "@/lib/prisma";

export type GenerateReportResult = {
  buffer: ArrayBuffer;
  filename: string;
  token?: string;
  downloadUrl?: string;
  expiresAt?: string;
};

function defaultBranding(): BrandingProfile {
  return { theme: "ORANGE" };
}

export async function resolveOwnerBranding(
  ownerUserId: string,
  override?: Partial<BrandingProfile>,
): Promise<BrandingProfile> {
  const db = getPrisma();
  const row = await db.mediaOwnerBranding.findUnique({
    where: { ownerUserId },
  });
  return {
    logoUrl: override?.logoUrl ?? row?.logoUrl,
    companyName: override?.companyName ?? row?.companyName,
    businessNumber: override?.businessNumber ?? row?.businessNumber,
    contactPhone: override?.contactPhone ?? row?.contactPhone,
    contactEmail: override?.contactEmail ?? row?.contactEmail,
    theme: override?.theme ?? row?.theme ?? "ORANGE",
  };
}

export async function generateMediaOwnerReport(opts: {
  ownerUserId: string;
  mediaId: string;
  reportType: MediaOwnerReportType;
  periodMonth?: string;
  year?: number;
  brandingOverride?: Partial<BrandingProfile>;
  skipDownloadLimit?: boolean;
  createToken?: boolean;
  siteOrigin?: string;
}): Promise<GenerateReportResult | { error: string; status: number }> {
  const owns = await assertOwnsMedia(opts.ownerUserId, opts.mediaId);
  if (!owns) return { error: "매체 접근 권한이 없습니다.", status: 403 };

  if (!opts.skipDownloadLimit) {
    const gate = await assertCanDownloadReport(opts.ownerUserId);
    if (!gate.ok) return { error: gate.message, status: 429 };
  }

  const payload = await loadMediaOwnerReportPayload({
    mediaId: opts.mediaId,
    reportType: opts.reportType,
    periodMonth: opts.periodMonth,
    year: opts.year,
  });
  if (!payload) return { error: "매체를 찾을 수 없습니다.", status: 404 };

  const access = await getMediaOwnerReportAccess(opts.ownerUserId);
  const branding = await resolveOwnerBranding(
    opts.ownerUserId,
    opts.brandingOverride,
  );

  const buffer = await buildMediaOwnerReportPdf({
    payload,
    reportType: opts.reportType,
    branding,
    whitelabel: access.whitelabel,
    watermark: access.watermark,
    periodMonth: opts.periodMonth,
    year: opts.year,
  });

  if (!opts.skipDownloadLimit) {
    await recordMediaOwnerReportDownload(
      opts.ownerUserId,
      opts.mediaId,
      opts.reportType,
    );
  }

  const now = new Date();
  const month =
    opts.periodMonth ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const filename =
    opts.reportType === "SPEC_SHEET"
      ? specSheetFilename(payload.media.name, now)
      : opts.reportType === "MONTHLY"
        ? monthlyReportFilename(payload.media.name, month)
        : opts.reportType === "ANNUAL"
          ? annualReportFilename(payload.media.name, opts.year ?? now.getFullYear())
          : `${payload.media.name}_catalog.pdf`;

  let token: string | undefined;
  let downloadUrl: string | undefined;
  let expiresAt: string | undefined;

  if (opts.createToken) {
    const db = getPrisma();
    token = randomBytes(24).toString("base64url");
    const exp = new Date(Date.now() + 24 * 3600_000);
    expiresAt = exp.toISOString();
    await db.mediaOwnerReportToken.create({
      data: {
        token,
        ownerUserId: opts.ownerUserId,
        mediaId: opts.mediaId,
        reportType: opts.reportType,
        periodMonth: opts.periodMonth ?? null,
        year: opts.year ?? null,
        expiresAt: exp,
      },
    });
    const origin = opts.siteOrigin ?? "https://tkad.co.kr";
    downloadUrl = `${origin}/api/media-owner/reports/download?token=${token}`;
  }

  return { buffer, filename, token, downloadUrl, expiresAt };
}

export async function generateCatalogReport(opts: {
  ownerUserId: string;
  mediaIds: string[];
  brandingOverride?: Partial<BrandingProfile>;
}): Promise<GenerateReportResult | { error: string; status: number }> {
  const gate = await assertCanDownloadReport(opts.ownerUserId);
  if (!gate.ok) return { error: gate.message, status: 429 };

  const summaries = await loadOwnerMediaSummaries(opts.ownerUserId);
  const allowed = new Set(summaries.map((s) => s.id));
  const ids = opts.mediaIds.filter((id) => allowed.has(id));
  if (ids.length === 0) {
    return { error: "선택한 매체가 없습니다.", status: 400 };
  }

  const payloads = [];
  for (const id of ids) {
    const p = await loadMediaOwnerReportPayload({
      mediaId: id,
      reportType: "CATALOG",
    });
    if (p) payloads.push(p);
  }

  const access = await getMediaOwnerReportAccess(opts.ownerUserId);
  const branding = await resolveOwnerBranding(
    opts.ownerUserId,
    opts.brandingOverride,
  );

  const buffer = await buildMediaOwnerCatalogPdf({
    payloads,
    branding,
    whitelabel: access.whitelabel,
    watermark: access.watermark,
  });

  await recordMediaOwnerReportDownload(opts.ownerUserId, null, "CATALOG");

  return {
    buffer,
    filename: `매체카탈로그_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.pdf`,
  };
}

export async function downloadReportByToken(token: string) {
  const db = getPrisma();
  const row = await db.mediaOwnerReportToken.findUnique({ where: { token } });
  if (!row || row.expiresAt < new Date()) {
    return { error: "만료되었거나 유효하지 않은 링크입니다.", status: 410 };
  }

  return generateMediaOwnerReport({
    ownerUserId: row.ownerUserId,
    mediaId: row.mediaId,
    reportType: row.reportType,
    periodMonth: row.periodMonth ?? undefined,
    year: row.year ?? undefined,
    skipDownloadLimit: true,
  });
}
