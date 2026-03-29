import { NextRequest } from "next/server";
import { assertAdmin, json } from "@/lib/admin-guard";
import { geocodeAddressWithKakao } from "@/lib/kakao-address-geocode";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const deny = assertAdmin(request);
  if (deny) return deny;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const q =
    body !== null &&
    typeof body === "object" &&
    typeof (body as { query?: unknown }).query === "string"
      ? String((body as { query: string }).query).trim()
      : "";
  if (!q) {
    return json({ error: "query(주소)가 필요합니다." }, 400);
  }

  const hit = await geocodeAddressWithKakao(q);
  if (!hit) {
    return json(
      {
        error:
          "주소를 찾지 못했습니다. 카카오 REST 키(KAKAO_REST_API_KEY)와 주소를 확인하세요.",
      },
      404,
    );
  }

  return json({
    latitude: hit.latitude,
    longitude: hit.longitude,
    city: hit.city,
    district: hit.district,
    addressName: hit.addressName,
  });
}
