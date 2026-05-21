import { resolveModel, getAnthropicClient } from "@/lib/ai-content-generator";
import type { AcademyDownload } from "@/lib/academy-content";

/** PDF 본문에 넣을 짧은 AI 인사이트 문단 (영문, jsPDF 호환) */
export async function generateAcademyAssetInsights(
  asset: AcademyDownload,
): Promise<string[]> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return [];

  const client = getAnthropicClient();
  const model = resolveModel();
  const bullets = asset.bulletsEn.join("; ");

  const message = await client.messages.create({
    model,
    max_tokens: 1200,
    messages: [
      {
        role: "user",
        content: `You are an OOH media educator. For the asset "${asset.titleEn}" (${asset.descEn}), write exactly 3 short paragraphs (2-3 sentences each) in English for a PDF appendix. Bullets to expand: ${bullets}. Output plain text only, separate paragraphs with blank lines. No markdown headers.`,
      },
    ],
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n")
    .trim();

  if (!text) return [];
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 4);
}

export type AcademyFullPdfContent = {
  bodySections: string[];
  checklist: string[];
  faq: string[];
  contact: string[];
};

/** 확장 PDF용 본문·FAQ (영문, jsPDF 호환) */
export async function generateAcademyAssetFullPdf(
  asset: AcademyDownload,
  targetPages: number,
): Promise<AcademyFullPdfContent> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  const fallback: AcademyFullPdfContent = {
    bodySections: asset.bulletsEn.map((b) => `• ${b}`),
    checklist: asset.bulletsEn.slice(0, 5).map((b, i) => `${i + 1}. ${b}`),
    faq: [
      "Q: How long does OOH planning take? A: Typically 2–4 weeks for quotes and clearance.",
      "Q: What budget should we start with? A: Many brands begin from KRW 3M/month for test flights.",
    ],
    contact: [
      "THINKAD (Singkeodeu) — thinkad.co.kr",
      "Email: contact@thinkad.co.kr",
      "Planner: /planner · Media catalog: /media",
    ],
  };
  if (!key) return fallback;

  const client = getAnthropicClient();
  const model = resolveModel();
  const message = await client.messages.create({
    model,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are an OOH educator writing a ${targetPages}-page PDF workbook titled "${asset.titleEn}".
Return ONLY valid JSON with keys:
- bodySections: string[] (8-14 paragraphs, 3-5 sentences each, English, practical OOH advice with example numbers)
- checklist: string[] (8-12 actionable checklist lines)
- faq: string[] (6-8 FAQ lines as "Q: ... A: ...")
- contact: string[] (2-4 lines: THINKAD contact, website, planner CTA)
Topic bullets: ${asset.bulletsEn.join("; ")}`,
      },
    ],
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();

  try {
    const parsed = JSON.parse(text) as AcademyFullPdfContent;
    if (Array.isArray(parsed.bodySections) && parsed.bodySections.length > 0) {
      return parsed;
    }
  } catch {
    /* fallback */
  }
  return fallback;
}
