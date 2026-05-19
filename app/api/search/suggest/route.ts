import { z } from "zod";
import { suggestMediaNames } from "@/lib/unified-search";
import { rateLimit } from "@/lib/rate-limit";
import {
  apiError,
  apiOk,
  apiServerError,
  apiZodError,
  getClientIp,
} from "@/lib/api-response";

export const runtime = "nodejs";

const Query = z.object({
  q: z.string().min(1).max(120),
  locale: z.enum(["ko", "en", "zh", "ja"]).optional(),
  limit: z.coerce.number().min(1).max(10).optional(),
});

const limiter = rateLimit({ limit: 120, windowMs: 60 * 1000 });

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    if (!limiter.check(`search-suggest:${ip}`)) {
      return apiError("RATE_LIMITED", 429);
    }

    const url = new URL(req.url);
    const parsed = Query.safeParse({
      q: url.searchParams.get("q") ?? "",
      locale: url.searchParams.get("locale") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) return apiZodError(parsed.error);

    const items = await suggestMediaNames(
      parsed.data.q,
      parsed.data.limit ?? 5,
      parsed.data.locale ?? "ko",
    );

    return apiOk({ items });
  } catch (e) {
    return apiServerError(e, "search/suggest");
  }
}
