import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { apiError, apiOk, readJson } from "@/lib/api-response";

export const runtime = "nodejs";

const vitalSchema = z.object({
  name: z.enum(["CLS", "FCP", "FID", "INP", "LCP", "TTFB"]),
  value: z.number().finite().nonnegative(),
  rating: z.enum(["good", "needs-improvement", "poor"]).optional(),
  path: z.string().max(512).default("/"),
  locale: z.string().max(8).optional(),
  navigationType: z.string().max(32).optional(),
  id: z.string().max(64).optional(),
});

/**
 * POST /api/vitals — Core Web Vitals 수집 (공개, DB 미설정 시 no-op).
 */
export async function POST(req: NextRequest) {
  const raw = await readJson(req);
  const parsed = vitalSchema.safeParse(raw);
  if (!parsed.success) {
    return apiError("INVALID_INPUT", 400);
  }

  if (!isDatabaseConfigured()) {
    return apiOk({ saved: false });
  }

  const { name, value, rating, path, locale, navigationType } = parsed.data;

  try {
    await prisma.webVital.create({
      data: {
        name,
        value,
        rating: rating ?? null,
        path,
        locale: locale ?? null,
        navigationType: navigationType ?? null,
      },
    });
    return apiOk({ saved: true });
  } catch (e) {
    console.error("[api:vitals]", e);
    return apiOk({ saved: false });
  }
}
