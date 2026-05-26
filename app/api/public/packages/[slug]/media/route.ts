import { NextRequest } from "next/server";
import {
  fetchMediaForPackage,
  fetchMediaPackageBySlug,
} from "@/lib/media-package-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const pkg = await fetchMediaPackageBySlug(slug);
  if (!pkg) {
    return Response.json({ error: "Package not found" }, { status: 404 });
  }

  const { media, usedFallback } = await fetchMediaForPackage(pkg, 20);

  return Response.json({
    package: pkg,
    media,
    meta: { usedFallback, count: media.length },
  });
}
