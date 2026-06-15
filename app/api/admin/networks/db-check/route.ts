import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { resolveDatabaseUrl } from "@/lib/database-url";
import { getPrisma } from "@/lib/prisma";
import { prismaErrorDetail } from "@/lib/prisma-error-detail";

export const dynamic = "force-dynamic";

const REQUIRED_NETWORK_COLUMNS = [
  "updated_at",
  "package_options",
  "price_note",
  "tags",
  "visibility_score",
] as const;

function databaseHostHint(): string | null {
  const raw = resolveDatabaseUrl();
  if (!raw) return null;
  try {
    const normalized = raw.replace(/^postgres(ql)?:\/\//i, "https://");
    const host = new URL(normalized).hostname;
    return host || null;
  } catch {
    const m = raw.match(/@([^/?]+)/);
    return m?.[1] ?? null;
  }
}

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const host = databaseHostHint();
  const out: Record<string, unknown> = {
    ok: false,
    host,
    networkCount: null as number | null,
    missingColumns: [] as string[],
    insertTest: null as string | null,
    error: null as string | null,
  };

  try {
    const db = getPrisma();
    const cols = await db.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'media_networks'
      ORDER BY 1`;
    const have = new Set(cols.map((c) => c.column_name));
    const missing = REQUIRED_NETWORK_COLUMNS.filter((c) => !have.has(c));
    out.missingColumns = missing;

    out.networkCount = await db.mediaNetwork.count();

    if (missing.length === 0) {
      const test = await db.mediaNetwork.create({
        data: {
          name: `[db-check] ${new Date().toISOString()}`,
          type: "bus_shelter",
          totalLocations: 0,
          regions: [],
          isActive: false,
        },
      });
      await db.mediaNetwork.delete({ where: { id: test.id } });
      out.insertTest = "ok";
      out.ok = true;
    } else {
      out.insertTest = "skipped_missing_columns";
      out.error = `누락 컬럼: ${missing.join(", ")} — 이 DB에 migrate deploy 필요`;
    }
  } catch (e) {
    out.error = prismaErrorDetail(e) ?? "database_error";
    out.insertTest = "failed";
  }

  return json(out, out.ok ? 200 : 503);
}
