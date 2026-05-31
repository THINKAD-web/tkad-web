import { Suspense } from "react";
import {
  prismaMediaToAdminDto,
  type AdminMediaDto,
} from "@/lib/admin-media-dto";
import { loadMediaEngagementMap } from "@/lib/admin-media-engagement";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { attachInstallLocationsById } from "@/lib/read-media-install-locations";
import { attachCoverageDistrictCodesById } from "@/lib/read-media-coverage-district-codes";
import AdminMediasClient from "./admin-medias-client";

export const dynamic = "force-dynamic";

export default async function AdminMediasPage() {
  let initialMedias: AdminMediaDto[] = [];
  let initialListError: string | null = null;
  let initialEngagement = {};

  if (!isDatabaseConfigured()) {
    initialListError = "Database not configured";
  } else {
    try {
      const db = getPrisma();
      const [rows, engagement] = await Promise.all([
        db.media.findMany({
          orderBy: { updatedAt: "desc" },
          take: 500,
        }),
        loadMediaEngagementMap(),
      ]);
      const withCoverage = await attachCoverageDistrictCodesById(db, rows);
      const withExtras = await attachInstallLocationsById(db, withCoverage);
      initialMedias = withExtras.map(prismaMediaToAdminDto);
      initialEngagement = engagement;
    } catch {
      initialListError = "서버에서 매체 목록을 불러오지 못했습니다.";
    }
  }

  return (
    <Suspense
      fallback={
        <p className="p-6 text-sm text-muted-foreground">매체 목록 로딩…</p>
      }
    >
      <AdminMediasClient
        initialMedias={initialMedias}
        initialListError={initialListError}
        initialEngagement={initialEngagement}
      />
    </Suspense>
  );
}
