import { getAnthropicClient, resolveModel } from "@/lib/ai-content-generator";

export type CreativeAiCheck = {
  id: string;
  label: string;
  passed: boolean;
  score?: number;
  detail?: string;
};

export type CreativeAiReviewResult = {
  passed: boolean;
  overallScore: number;
  checks: CreativeAiCheck[];
  feedbackKo: string;
  feedbackEn: string;
};

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MIN_WIDTH = 800;
const MIN_HEIGHT = 600;
const MAX_ASPECT = 4;
const BLOCKLIST = ["성인", "폭력", "혐오", "도박", "불법"];

function specChecks(input: {
  type: "image" | "video";
  width: number | null;
  height: number | null;
  fileSize: number | null;
  name: string;
}): CreativeAiCheck[] {
  const checks: CreativeAiCheck[] = [];
  const w = input.width ?? 0;
  const h = input.height ?? 0;

  checks.push({
    id: "resolution",
    label: "해상도",
    passed: w >= MIN_WIDTH && h >= MIN_HEIGHT,
    score: w && h ? Math.min(100, Math.round((w * h) / (1920 * 1080) * 100)) : 0,
    detail:
      w && h
        ? `${w}×${h}px`
        : "가로·세로 정보 없음 — 800×600 이상 권장",
  });

  if (w > 0 && h > 0) {
    const ratio = Math.max(w / h, h / w);
    checks.push({
      id: "aspect",
      label: "비율",
      passed: ratio <= MAX_ASPECT,
      detail: ratio > MAX_ASPECT ? "극단적 비율 — 재크롭 권장" : "적정 비율",
    });
  }

  const size = input.fileSize ?? 0;
  checks.push({
    id: "filesize",
    label: "용량",
    passed: size > 0 && size <= MAX_IMAGE_BYTES,
    detail: size
      ? `${Math.round(size / 1024)}KB`
      : "용량 정보 없음",
  });

  const hay = input.name.toLowerCase();
  const blocked = BLOCKLIST.some((w) => hay.includes(w));
  checks.push({
    id: "keyword",
    label: "키워드 필터",
    passed: !blocked,
    detail: blocked ? "파일명에 검수 제외 키워드 포함" : "통과",
  });

  return checks;
}

async function visionReview(imageUrl: string): Promise<{
  readability: number;
  logoVisibility: number;
  safety: boolean;
  note: string;
} | null> {
  const client = getAnthropicClient();
  if (!client) return null;
  try {
    const res = await client.messages.create({
      model: resolveModel(),
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "url", url: imageUrl },
            },
            {
              type: "text",
              text: `OOH 광고 소재 1차 검수. JSON만 반환:
{"readability":0-100,"logoVisibility":0-100,"safe":true/false,"note":"한글 1문장"}
기준: 텍스트 가독성, 브랜드 로고 시인성, 선정성/폭력/혐오 없음`,
            },
          ],
        },
      ],
    });
    const text =
      res.content[0]?.type === "text" ? res.content[0].text.trim() : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]!) as {
      readability?: number;
      logoVisibility?: number;
      safe?: boolean;
      note?: string;
    };
    return {
      readability: Math.min(100, Math.max(0, Number(parsed.readability) || 50)),
      logoVisibility: Math.min(
        100,
        Math.max(0, Number(parsed.logoVisibility) || 50),
      ),
      safety: parsed.safe !== false,
      note: String(parsed.note ?? ""),
    };
  } catch {
    return null;
  }
}

export async function reviewCreativeAsset(input: {
  type: "image" | "video";
  url: string;
  name: string;
  width: number | null;
  height: number | null;
  fileSize: number | null;
}): Promise<CreativeAiReviewResult> {
  const checks = specChecks(input);
  let readability = 70;
  let logoVisibility = 60;
  let safe = true;
  let visionNote = "";

  if (input.type === "image") {
    const vision = await visionReview(input.url);
    if (vision) {
      readability = vision.readability;
      logoVisibility = vision.logoVisibility;
      safe = vision.safety;
      visionNote = vision.note;
      checks.push({
        id: "readability",
        label: "텍스트 가독성",
        passed: readability >= 55,
        score: readability,
        detail: visionNote || undefined,
      });
      checks.push({
        id: "logo",
        label: "로고 시인성",
        passed: logoVisibility >= 45,
        score: logoVisibility,
      });
      checks.push({
        id: "safety",
        label: "콘텐츠 안전",
        passed: safe,
        detail: safe ? "적합" : "부적절 콘텐츠 의심",
      });
    } else {
      checks.push({
        id: "readability",
        label: "텍스트 가독성",
        passed: true,
        score: 65,
        detail: "AI 비전 미사용 — 규격 검수만 적용",
      });
      checks.push({
        id: "logo",
        label: "로고 시인성",
        passed: true,
        score: 60,
        detail: "수동 검수 권장",
      });
      checks.push({
        id: "safety",
        label: "콘텐츠 안전",
        passed: true,
        detail: "키워드 필터 통과",
      });
    }
  } else {
    checks.push({
      id: "video",
      label: "영상 소재",
      passed: (input.fileSize ?? 0) <= 100 * 1024 * 1024,
      detail: "영상은 규격·용량 검수 후 매체사 수동 검수",
    });
  }

  const failed = checks.filter((c) => !c.passed);
  const scores = checks
    .map((c) => c.score ?? (c.passed ? 80 : 30))
    .filter((s) => s > 0);
  const overallScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : failed.length === 0
        ? 75
        : 40;

  const passed = failed.length === 0 && overallScore >= 55;

  const feedbackKo = passed
    ? `AI 1차 검수 통과 (종합 ${overallScore}점). 매체사에 소재가 전달됩니다.`
    : `재제출이 필요합니다: ${failed.map((f) => f.label).join(", ")}. ${visionNote}`.trim();

  const feedbackEn = passed
    ? `AI pre-check passed (score ${overallScore}). Forwarded to media owner.`
    : `Please resubmit: ${failed.map((f) => f.label).join(", ")}.`;

  return {
    passed,
    overallScore,
    checks,
    feedbackKo,
    feedbackEn,
  };
}
