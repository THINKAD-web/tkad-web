import {
  prismaMediaToAdminDto,
  type AdminMediaDto,
} from "@/lib/admin-media-dto";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import AdminMediasClient from "./admin-medias-client";

export const dynamic = "force-dynamic";

export default async function AdminMediasPage() {
  let initialMedias: AdminMediaDto[] = [];
  let initialListError: string | null = null;

  if (!isDatabaseConfigured()) {
    initialListError = "Database not configured";
  } else {
    try {
      const db = getPrisma();
      const rows = await db.media.findMany({
        orderBy: { updatedAt: "desc" },
        take: 500,
      });
      initialMedias = rows.map(prismaMediaToAdminDto);
    } catch {
      initialListError = "서버에서 매체 목록을 불러오지 못했습니다.";
    }
  }

  return (
    <AdminMediasClient
      initialMedias={initialMedias}
      initialListError={initialListError}
    />
  );
}
