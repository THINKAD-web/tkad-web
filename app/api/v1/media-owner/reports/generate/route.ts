import { NextRequest } from "next/server";
import type { MediaOwnerReportType } from "@prisma/client";
import { withApiKeyAuth, v1Json, v1Error } from "@/lib/api-key-auth";
import { assertOwnsMedia } from "@/lib/media-owner-guard";
import { generateMediaOwnerReport } from "@/lib/media-owner-report-service";
import { siteUrl } from "@/lib/seo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const VALID_TYPES = new Set<MediaOwnerReportType>([
  "SPEC_SHEET",
  "MONTHLY",
  "ANNUAL",
  "CATALOG",
]);

export async function POST(request: NextRequest) {
  return withApiKeyAuth(
    request,
    "/api/v1/media-owner/reports/generate",
    async (apiKey) => {
      let body: {
        mediaId?: string;
        reportType?: MediaOwnerReportType;
        brandingProfile?: Record<string, unknown>;
        periodMonth?: string;
        year?: number;
      };
      try {
        body = await request.json();
      } catch {
        return v1Error("INVALID_JSON", 400);
      }

      if (!body.mediaId || !body.reportType || !VALID_TYPES.has(body.reportType)) {
        return v1Error("INVALID_REQUEST", 400, "mediaId and reportType required");
      }

      const owns = await assertOwnsMedia(apiKey.userId, body.mediaId);
      if (!owns) {
        return v1Error("FORBIDDEN", 403, "You do not own this media");
      }

      const brandingOverride = body.brandingProfile as
        | {
            logoUrl?: string;
            companyName?: string;
            businessNumber?: string;
            contactPhone?: string;
            contactEmail?: string;
            theme?: "ORANGE" | "BLUE" | "VIOLET";
          }
        | undefined;

      const result = await generateMediaOwnerReport({
        ownerUserId: apiKey.userId,
        mediaId: body.mediaId,
        reportType: body.reportType,
        periodMonth: body.periodMonth,
        year: body.year,
        brandingOverride,
        createToken: true,
        siteOrigin: siteUrl.replace(/\/$/, ""),
      });

      if ("error" in result) {
        return v1Error("GENERATION_FAILED", result.status, result.error);
      }

      return v1Json({
        downloadUrl: result.downloadUrl,
        expiresAt: result.expiresAt,
        filename: result.filename,
      });
    },
  );
}
