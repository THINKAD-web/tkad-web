import { NextRequest, NextResponse } from "next/server";
import { requirePlannerPdfAccess, plannerPdfAccessDeniedMessage } from "@/lib/require-planner-pdf-access";
import {
  generalProposalOutputSchema,
  PROPOSAL_TYPE_META,
  PROPOSAL_SECTION_META,
  studioProposalInputSchema,
  type ProposalSectionType,
} from "@/lib/proposal/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const VIOLET = "7C3AED";
const INK = "111827";
const GRAY = "6B7280";

export async function POST(request: NextRequest) {
  const access = await requirePlannerPdfAccess();
  if (!access.allowed) {
    return new NextResponse(plannerPdfAccessDeniedMessage(access.status), {
      status: access.status,
    });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const input = studioProposalInputSchema.safeParse(body.input);
  const output = generalProposalOutputSchema.safeParse(body.output);
  const sections = Array.isArray(body.sections) ? (body.sections as ProposalSectionType[]) : [];
  if (!input.success || !output.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const inp = input.data;
  const out = output.data;
  const isKo = inp.locale !== "en";
  const typeMeta = PROPOSAL_TYPE_META[inp.type];

  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  const W = 13.33;

  // 표지
  const cover = pptx.addSlide();
  cover.background = { color: "FFFFFF" };
  cover.addText("THINKAD · 싱커드", { x: 0.6, y: 0.5, fontSize: 12, color: VIOLET, bold: true });
  cover.addText(inp.campaignName || `${inp.brandName} ${isKo ? "제안서" : "Proposal"}`, {
    x: 0.6, y: 2.4, w: W - 1.2, fontSize: 32, bold: true, color: INK,
  });
  cover.addText(`${inp.brandName} · ${inp.industry} · ${isKo ? typeMeta.ko : typeMeta.en}`, {
    x: 0.6, y: 3.5, fontSize: 16, color: GRAY,
  });

  const textSlide = (title: string, content: string) => {
    if (!content?.trim()) return;
    const s = pptx.addSlide();
    s.background = { color: "FFFFFF" };
    s.addText(title, { x: 0.6, y: 0.4, fontSize: 22, bold: true, color: VIOLET });
    s.addText(content, { x: 0.6, y: 1.3, w: W - 1.2, h: 5.5, fontSize: 14, color: INK, valign: "top" });
  };
  const bulletSlide = (title: string, items: string[]) => {
    if (!items.length) return;
    const s = pptx.addSlide();
    s.background = { color: "FFFFFF" };
    s.addText(title, { x: 0.6, y: 0.4, fontSize: 22, bold: true, color: VIOLET });
    s.addText(items.map((t) => ({ text: t, options: { bullet: true } })), {
      x: 0.6, y: 1.3, w: W - 1.2, h: 5.5, fontSize: 14, color: INK, valign: "top",
    });
  };
  const lbl = (s: ProposalSectionType) => (isKo ? PROPOSAL_SECTION_META[s].ko : PROPOSAL_SECTION_META[s].en);

  for (const sec of sections) {
    if (sec === "cover") continue;
    if (sec === "market_analysis" && out.marketAnalysis) textSlide(lbl(sec), out.marketAnalysis);
    else if (sec === "strategy" && out.strategy) textSlide(lbl(sec), out.strategy);
    else if (sec === "media_recommend" && out.mediaMix?.length)
      bulletSlide(lbl(sec), out.mediaMix.map((m) => `${m.mediaName} · ${m.role} (${m.budgetSharePct}%) — ${m.rationale}`));
    else if (sec === "competitor" && out.competitors?.length)
      bulletSlide(lbl(sec), out.competitors.map((c) => `${c.name}: ${c.approach} → ${c.differentiation}`));
    else if (sec === "case_study" && out.caseStudies?.length)
      bulletSlide(lbl(sec), out.caseStudies.map((c) => `${c.title} — ${c.summary}${c.result ? ` (${c.result})` : ""}`));
    else if (sec === "roi_scenario" && out.roiScenarios?.length)
      bulletSlide(lbl(sec), out.roiScenarios.map((r) => `${r.label}: ${isKo ? "노출" : "Impr."} ${r.impressions.toLocaleString()} · ${isKo ? "도달" : "Reach"} ${r.reach.toLocaleString()}`));
    else if (sec === "budget") {
      const rows = (out.budgetAllocation ?? []).map((b) => `${b.label}: ₩${b.amountWon.toLocaleString()} (${b.sharePct}%)`);
      if (out.metrics) rows.push(`${isKo ? "예상 노출" : "Impr."} ${out.metrics.estimatedImpressions.toLocaleString()} · ${isKo ? "도달" : "Reach"} ${out.metrics.estimatedReach.toLocaleString()} · CPM ₩${out.metrics.estimatedCpm.toLocaleString()}`);
      bulletSlide(lbl(sec), rows);
    } else if (sec === "timeline" && out.timeline?.length)
      bulletSlide(lbl(sec), out.timeline.map((t) => `${t.phase} (${t.period}): ${t.tasks.join(", ")}`));
    else if (sec === "appendix" && out.appendix) textSlide(lbl(sec), out.appendix);
  }

  const buf = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  const fname = `THINKAD_proposal_${Date.now()}.pptx`;
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${fname}"`,
      "Cache-Control": "no-store",
    },
  });
}
