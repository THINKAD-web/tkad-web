import { NextRequest, NextResponse } from "next/server";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { fetchPublishedCases } from "@/lib/case-queries";
import { generateProposal } from "@/lib/proposal/generate-proposal";
import { studioProposalInputSchema, sectionsForType } from "@/lib/proposal/types";
import { requirePlannerPdfAccess } from "@/lib/require-planner-pdf-access";
import type { MediaItem } from "@/lib/media-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const access = await requirePlannerPdfAccess();
  if (!access.allowed) {
    return NextResponse.json(
      { error: access.status === 401 ? "Login required" : "PRO required" },
      { status: access.status },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = studioProposalInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const sections = sectionsForType(input.type);
  const isKo = input.locale !== "en";

  // 선정 매체 — 입력이 있으면 사용, 없고 media_recommend 섹션이면 지역/카탈로그에서 자동 선별
  const catalog = await fetchPublicMediaCatalog().catch(() => [] as MediaItem[]);
  const byId = new Map(catalog.map((m) => [m.id, m]));
  let selectedMedia: MediaItem[] = input.mediaIds
    .map((id) => byId.get(id))
    .filter((m): m is MediaItem => !!m);

  if (selectedMedia.length === 0 && sections.includes("media_recommend")) {
    const regionSet = new Set(input.regions.map((r) => r.toLowerCase()));
    const pool = regionSet.size
      ? catalog.filter(
          (m) =>
            regionSet.has((m.region ?? "").toLowerCase()) ||
            input.regions.some((r) => (m.location ?? "").includes(r)),
        )
      : catalog;
    selectedMedia = (pool.length ? pool : catalog).slice(0, 5);
  }

  // 사례 (case_study 섹션용)
  const cases = sections.includes("case_study")
    ? await fetchPublishedCases({ locale: isKo ? "ko" : "en", limit: 6 })
        .then((rows) =>
          rows
            .filter((r) => r.title && r.summary)
            .slice(0, 6)
            .map((r) => ({ title: r.title!, summary: r.summary!, result: undefined })),
        )
        .catch(() => [])
    : [];

  try {
    const result = await generateProposal(input, selectedMedia, cases);
    return NextResponse.json({
      input,
      type: result.type,
      sections: result.sections,
      output: result.output,
    });
  } catch (e) {
    console.error("[studio/proposal] generate failed", e);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
