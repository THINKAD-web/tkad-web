import { z } from "zod";
import {
  apiError,
  apiOk,
  apiZodError,
} from "@/lib/api-response";
import { requireMediaOwner } from "@/lib/media-owner-guard";
import { respondPriceNegotiation } from "@/lib/price-negotiation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const Body = z.object({
  accept: z.boolean(),
  ownerNote: z.string().max(2000).optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireMediaOwner();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError("INVALID_INPUT", 400);
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return apiZodError(parsed.error);

  const result = await respondPriceNegotiation({
    id,
    ownerUserId: auth.user.id,
    accept: parsed.data.accept,
    ownerNote: parsed.data.ownerNote,
  });

  if (!result.ok) {
    return apiError("NOT_FOUND", 404, {
      message: "요청을 찾을 수 없거나 이미 처리되었습니다.",
    });
  }

  return apiOk({
    id,
    status: parsed.data.accept ? "ACCEPTED" : "REJECTED",
    quoteId: result.quoteId ?? null,
    contractUrl: result.contractUrl ?? null,
    previewUrl: result.previewUrl ?? null,
  });
}
