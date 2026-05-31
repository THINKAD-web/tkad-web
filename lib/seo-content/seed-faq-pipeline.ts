import Anthropic from "@anthropic-ai/sdk";
import {
  getSeedAnthropicClient,
  resolveSeedModel,
  withSeedDelay,
} from "@/lib/content-auto/seed-claude-direct";
import {
  FAQ_CATALOG,
  FAQ_CATEGORY_META,
  FAQ_CATEGORY_ORDER,
  type FaqCategoryId,
} from "@/lib/seo-content/faq-catalog";
import { getPrisma } from "@/lib/prisma";

const FAQ_SYSTEM_PROMPT = `당신은 THINKAD 싱커드의 OOH 광고 전문가입니다.
광고주가 실제로 궁금해하는 질문에 친절하고 전문적으로 답변하세요.
답변 길이: 100~200자
자연스럽게 싱커드 플랫폼 언급 포함
한국어로 작성`;

const FAQ_TOOL = "emit_faq_answers" as const;

type FaqAnswerRow = { question: string; answer: string };

function faqTool(): Anthropic.Tool {
  return {
    name: FAQ_TOOL,
    description: "Submit FAQ answers for the given questions. One entry per question.",
    input_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              answer: { type: "string" },
            },
            required: ["question", "answer"],
          },
        },
      },
      required: ["items"],
    },
  };
}

async function generateFaqAnswersForCategory(
  category: FaqCategoryId,
  questions: string[],
): Promise<FaqAnswerRow[]> {
  const label = FAQ_CATEGORY_META[category].labelKo;
  const client = getSeedAnthropicClient();
  const model = resolveSeedModel();

  const message = await client.messages.create({
    model,
    max_tokens: 4096,
    system: FAQ_SYSTEM_PROMPT,
    tools: [faqTool()],
    tool_choice: { type: "tool", name: FAQ_TOOL },
    messages: [
      {
        role: "user",
        content: `카테고리: ${label}

아래 질문 각각에 대해 100~200자 한국어 답변을 작성하세요. 질문 문구는 그대로 유지하고 emit_faq_answers tool로 제출하세요.

${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`,
      },
    ],
  });

  for (const block of message.content) {
    if (block.type === "tool_use" && block.name === FAQ_TOOL) {
      const input = block.input as { items: FaqAnswerRow[] };
      return input.items;
    }
  }
  throw new Error(`Claude did not return tool ${FAQ_TOOL}`);
}

export type FaqSeedResult = {
  category: FaqCategoryId;
  status: "created" | "skipped" | "error";
  count?: number;
  error?: string;
};

export async function runFaqSeedPipeline(opts?: {
  useClaude?: boolean;
}): Promise<{
  results: FaqSeedResult[];
  created: number;
  skipped: number;
  errors: number;
}> {
  const db = getPrisma();
  const useClaude = opts?.useClaude !== false && !!process.env.ANTHROPIC_API_KEY?.trim();
  const results: FaqSeedResult[] = [];
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (let catIndex = 0; catIndex < FAQ_CATEGORY_ORDER.length; catIndex++) {
    const category = FAQ_CATEGORY_ORDER[catIndex];
    const items = FAQ_CATALOG.filter((i) => i.category === category);

    const existing = await db.faq.count({ where: { category } });
    if (existing >= items.length) {
      results.push({ category, status: "skipped", count: existing });
      skipped++;
      continue;
    }

    try {
      let answers: FaqAnswerRow[];

      if (useClaude) {
        await withSeedDelay(catIndex, async () => undefined);
        answers = await generateFaqAnswersForCategory(
          category,
          items.map((i) => i.questionKo),
        );
      } else {
        answers = items.map((i) => ({
          question: i.questionKo,
          answer: i.answerKo,
        }));
      }

      await db.faq.deleteMany({ where: { category } });

      for (const item of items) {
        const generated =
          answers.find((a) => a.question.trim() === item.questionKo.trim()) ??
          answers[item.order] ??
          answers[0];
        const answer =
          generated?.answer?.trim() ||
          item.answerKo;

        await db.faq.create({
          data: {
            category,
            order: item.order,
            question: item.questionKo,
            answer,
          },
        });
      }

      results.push({ category, status: "created", count: items.length });
      created++;
    } catch (e) {
      results.push({
        category,
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      });
      errors++;
    }
  }

  return { results, created, skipped, errors };
}
