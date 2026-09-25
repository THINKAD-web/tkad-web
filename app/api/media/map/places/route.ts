import { searchKakaoPlaces } from "@/lib/kakao-local-place-search";
import { apiOk, apiServerError } from "@/lib/api-response";
import { getKakaoRestApiKey } from "@/lib/kakao-address-geocode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams.get("query")?.trim() ?? "";
    if (!q) {
      return apiOk({ places: [], configured: Boolean(getKakaoRestApiKey()) });
    }
    if (!getKakaoRestApiKey()) {
      return apiOk({ places: [], configured: false });
    }
    const places = await searchKakaoPlaces(q, { limit: 8 });
    return apiOk({ places, configured: true });
  } catch (e) {
    return apiServerError(e, "media/map/places");
  }
}
