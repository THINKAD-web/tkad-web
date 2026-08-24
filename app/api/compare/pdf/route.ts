import { NextRequest, NextResponse } from "next/server";
import { comparePdfBuffer, type ComparePdfMediaRow } from "@/lib/build-compare-pdf";
import { COMPARE_MAX_ITEMS } from "@/lib/compare-constants";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { requirePlannerPdfAccess, plannerPdfAccessDeniedMessage } from "@/lib/require-planner-pdf-access";
import type { MediaItem } from "@/lib/media-data";

export const dynamic = "force-dynamic";

function parseIds(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= COMPARE_MAX_ITEMS) break;
  }
  return out;
}

function mediaToPdfRow(m: MediaItem, isKo: boolean): ComparePdfMediaRow {
  return {
    name: (isKo ? m.name : (m.nameEn || m.name)) || m.name,
    location: (isKo ? m.location : (m.locationEn || m.location)) || m.location,
    price: m.price,
    size: m.size || "—",
    resolution: m.resolution || "—",
    dailyFootTraffic: m.dailyFootTraffic,
    operatingHours:
      (isKo ? m.operatingHours : m.operatingHoursEn) || "—",
    targetAge: m.targetAge || "—",
    advertiserHistory:
      (isKo ? m.advertiserHistory : m.advertiserHistoryEn) || "—",
    nearbyFacilities:
      (isKo ? m.nearbyFacilities : m.nearbyFacilitiesEn) || "—",
    visibilityScore: Math.min(
      100,
      Math.max(0, Math.round(m.visibilityScore ?? 0)),
    ),
  };
}

export async function GET(request: NextRequest) {
  const pdfAccess = await requirePlannerPdfAccess();
  if (!pdfAccess.allowed) {
    return NextResponse.json(
      {
        error: plannerPdfAccessDeniedMessage(pdfAccess.status),
      },
      { status: pdfAccess.status },
    );
  }

  const { searchParams } = new URL(request.url);
  const ids = parseIds(searchParams.get("ids"));
  if (ids.length < 2) {
    return NextResponse.json(
      { error: "At least two valid media ids are required." },
      { status: 400 },
    );
  }

  try {
    const catalog = await fetchPublicMediaCatalog();
    const byId = new Map(catalog.map((m) => [m.id, m]));
    const items: MediaItem[] = [];
    for (const id of ids) {
      const m = byId.get(id);
      if (m) items.push(m);
    }

    if (items.length < 2) {
      return NextResponse.json(
        { error: "Could not resolve at least two media from the catalog." },
        { status: 404 },
      );
    }

    const rows = items.map((m) => mediaToPdfRow(m, false));
    const generatedAt = new Date().toISOString().slice(0, 10);
    const buf = await comparePdfBuffer({ generatedAt, rows });

    const filename = `thinkad-media-compare-${generatedAt}.pdf`;

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("[compare pdf] Failed to generate PDF", {
      message: err.message,
      stack: err.stack,
      name: err.name,
      cause: err.cause,
    });
    return NextResponse.json(
      {
        error: "Failed to generate PDF.",
        detail:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      },
      { status: 500 },
    );
  }
}
