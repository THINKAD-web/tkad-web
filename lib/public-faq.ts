import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  FAQ_CATALOG,
  FAQ_CATEGORY_ORDER,
  type FaqCategoryId,
} from "@/lib/seo-content/faq-catalog";
import {
  getPublicMediaCountLabel,
  injectMediaCountPlaceholder,
} from "@/lib/trust-metrics";

export type PublicFaqItem = {
  id: string;
  question: string;
  answer: string;
  category: FaqCategoryId;
  order: number;
};

function catalogFallback(): PublicFaqItem[] {
  return FAQ_CATALOG.map((item) => ({
    id: `catalog-${item.category}-${item.order}`,
    question: item.questionKo,
    answer: item.answerKo,
    category: item.category,
    order: item.order,
  }));
}

export async function getPublicFaqs(): Promise<PublicFaqItem[]> {
  const verifiedMediaLabel = await getPublicMediaCountLabel("verified");
  const withCount = (items: PublicFaqItem[]) =>
    items.map((item) => ({
      ...item,
      answer: injectMediaCountPlaceholder(item.answer, verifiedMediaLabel),
    }));

  if (!isDatabaseConfigured()) return withCount(catalogFallback());

  try {
    const rows = await getPrisma().faq.findMany({
      orderBy: [{ category: "asc" }, { order: "asc" }],
    });

    if (rows.length > 0) {
      return withCount(
        rows.map((r) => ({
          id: r.id,
          question: r.question,
          answer: r.answer,
          category: r.category as FaqCategoryId,
          order: r.order,
        })),
      );
    }
  } catch {
    /* DB / stale Prisma client — catalog fallback */
  }

  return withCount(catalogFallback());
}

export function groupFaqsByCategory(
  items: PublicFaqItem[],
): Map<FaqCategoryId, PublicFaqItem[]> {
  const map = new Map<FaqCategoryId, PublicFaqItem[]>();
  for (const cat of FAQ_CATEGORY_ORDER) {
    map.set(cat, []);
  }
  for (const item of items) {
    const list = map.get(item.category) ?? [];
    list.push(item);
    map.set(item.category, list);
  }
  for (const cat of FAQ_CATEGORY_ORDER) {
    map.get(cat)?.sort((a, b) => a.order - b.order);
  }
  return map;
}
