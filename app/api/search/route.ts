import { z } from "zod";
import { getCurrentUser } from "@/lib/user-session";
import { runUnifiedSearch } from "@/lib/unified-search";
import { logSearchQuery } from "@/lib/search-log";
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
  q: z.string().max(120).optional(),
  locale: z.enum(["ko", "en", "zh", "ja"]).optional(),
  perSection: z.coerce.number().min(1).max(50).optional(),
  mediaLimit: z.coerce.number().min(1).max(100).optional(),
});

const limiter = rateLimit({ limit: 60, windowMs: 60 * 1000 });

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    if (!limiter.check(`search:${ip}`)) {
      return apiError("RATE_LIMITED", 429);
    }

    const url = new URL(req.url);
    const parsed = Query.safeParse({
      q: url.searchParams.get("q") ?? "",
      locale: url.searchParams.get("locale") ?? undefined,
      perSection: url.searchParams.get("perSection") ?? undefined,
      mediaLimit: url.searchParams.get("mediaLimit") ?? undefined,
    });
    if (!parsed.success) return apiZodError(parsed.error);

    const results = await runUnifiedSearch({
      query: parsed.data.q ?? "",
      locale: parsed.data.locale,
      perSection: parsed.data.perSection,
      mediaLimit: parsed.data.mediaLimit,
    });

    const user = await getCurrentUser();
    void logSearchQuery({
      query: results.query,
      locale: parsed.data.locale,
      resultCount: results.totalCount,
      userId: user?.id,
    });

    return apiOk(results);
  } catch (e) {
    return apiServerError(e, "search");
  }
}
