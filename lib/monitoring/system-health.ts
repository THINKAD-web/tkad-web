import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { isEmailConfigured } from "@/lib/email/client";

export type ServiceStatus = {
  ok: boolean;
  configured: boolean;
  detail?: string;
};

export type SystemHealthSnapshot = {
  database: ServiceStatus;
  cloudinary: ServiceStatus;
  kakaoMap: ServiceStatus;
  resend: ServiceStatus;
  vercel: {
    configured: boolean;
    env: string | null;
    commit: string | null;
    deploymentUrl: string | null;
  };
  recentErrors: Array<{
    id: string;
    tag: string | null;
    path: string | null;
    status: number;
    message: string | null;
    createdAt: string;
  }>;
};

export async function loadSystemHealth(): Promise<SystemHealthSnapshot> {
  let database: ServiceStatus = {
    ok: false,
    configured: isDatabaseConfigured(),
    detail: "not_configured",
  };

  if (isDatabaseConfigured()) {
    try {
      const db = getPrisma();
      await db.$queryRaw`SELECT 1`;
      database = { ok: true, configured: true };
    } catch (e) {
      database = {
        ok: false,
        configured: true,
        detail: e instanceof Error ? e.message : "query_failed",
      };
    }
  }

  const cloudinaryConfigured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim(),
  );

  const kakaoConfigured = Boolean(process.env.KAKAO_REST_API_KEY?.trim());

  let recentErrors: SystemHealthSnapshot["recentErrors"] = [];
  if (isDatabaseConfigured()) {
    try {
      const db = getPrisma();
      const rows = await db.opsErrorLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 15,
        select: {
          id: true,
          tag: true,
          path: true,
          status: true,
          message: true,
          createdAt: true,
        },
      });
      recentErrors = rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      }));
    } catch {
      /* ignore */
    }
  }

  return {
    database,
    cloudinary: {
      ok: cloudinaryConfigured,
      configured: cloudinaryConfigured,
      detail: cloudinaryConfigured ? undefined : "env_missing",
    },
    kakaoMap: {
      ok: kakaoConfigured,
      configured: kakaoConfigured,
      detail: kakaoConfigured ? undefined : "KAKAO_REST_API_KEY",
    },
    resend: {
      ok: isEmailConfigured(),
      configured: isEmailConfigured(),
      detail: isEmailConfigured() ? undefined : "RESEND_API_KEY",
    },
    vercel: {
      configured: Boolean(process.env.VERCEL),
      env: process.env.VERCEL_ENV ?? null,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      deploymentUrl: process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : null,
    },
    recentErrors,
  };
}
