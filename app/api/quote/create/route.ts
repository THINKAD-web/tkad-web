import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import { computeNetworkMonthlyFromMediaItem } from "@/lib/media-network-types";
import {
  normalizeQuoteBudgetInputToManwon,
  wonToManwon,
} from "@/lib/ooh-quote-amount";
import {
  apiError,
  apiOk,
  apiServerError,
  apiZodError,
  readJson,
} from "@/lib/api-response";

export const runtime = "nodejs";

const Body = z.object({
  mediaIds: z.array(z.string().min(1)).min(1).max(50),
  clientName: z.string().min(1).max(40),
  clientEmail: z.string().email().max(254),
  clientPhone: z.string().max(20).optional(),
  clientCompany: z.string().max(80).optional(),
  period: z.string().min(1).max(40),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budgetMin: z.number().int().nonnegative().optional(),
  budgetMax: z.number().int().nonnegative().optional(),
  /** 네트워크 매체 선택 수량 — { [catalogId]: units }. 가격은 구간/단가로 환산. */
  networkUnits: z.record(z.string(), z.number().int().positive()).optional(),
  locale: z.enum(["ko", "en"]).default("ko"),
});

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    if (!body) return apiError("INVALID_JSON", 400);

    const parsed = Body.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    const {
      mediaIds,
      clientName,
      clientEmail,
      clientPhone,
      clientCompany,
      period,
      startDate,
      endDate,
      budgetMin,
      budgetMax,
      networkUnits,
      locale,
    } = parsed.data;

    const catalog = await fetchPublicMediaCatalog();
    const picked = catalog.filter((m) => mediaIds.includes(m.id));
    if (picked.length === 0) {
      return apiError("NO_VALID_MEDIA", 400, {
        message: "선택한 매체 중 유효한 매체가 없습니다.",
      });
    }

    // 네트워크 매체는 선택 수량(units)으로 월 단가를 환산, 일반 매체는 표시 단가(원) 사용.
    const totalWon = picked.reduce((sum, m) => {
      if (m.catalogSource === "network") {
        const units = networkUnits?.[m.id];
        if (units && units > 0) {
          return sum + computeNetworkMonthlyFromMediaItem(m, units);
        }
      }
      return sum + catalogPriceFieldToWon(m.price ?? 0);
    }, 0);
    const totalAmount = Math.max(1, wonToManwon(totalWon));
    const budgetMinMan = normalizeQuoteBudgetInputToManwon(budgetMin);
    const budgetMaxMan = normalizeQuoteBudgetInputToManwon(budgetMax);

    const quote = await prisma.ooHQuote.create({
      data: {
        status: "draft",
        clientName,
        clientEmail,
        clientPhone,
        clientCompany,
        mediaIds: picked.map((m) => m.id),
        totalAmount,
        period,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        budgetMin: budgetMinMan,
        budgetMax: budgetMaxMan,
        locale,
        pdfTemplate: "default",
      },
      select: { id: true, createdAt: true, totalAmount: true },
    });

    return apiOk(
      { id: quote.id, totalAmount: quote.totalAmount },
      { status: 201 },
    );
  } catch (e) {
    return apiServerError(e, "quote/create");
  }
}
