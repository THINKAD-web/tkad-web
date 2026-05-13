import { NextResponse } from "next/server";
import {
  buildMobileDistrictCoverageGeoJson,
  isAllowedCoverageDistrictCode,
} from "@/lib/geo/korea-sgg-coverage";

export const dynamic = "force-dynamic";

const MAX_CODES = 300;

/**
 * 전국 시·군·구 커버리지 근사 폴리곤 GeoJSON (공개, 인증 없음).
 * `codes` — 쉼표로 구분된 행정구역 5자리 코드 (예: `11680,11650`).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("codes")?.trim() ?? "";
  if (!raw) {
    return NextResponse.json(
      { type: "FeatureCollection", features: [] },
      { headers: { "Cache-Control": "public, max-age=86400" } },
    );
  }
  const parts = raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const codes = parts.slice(0, MAX_CODES).filter((c) => /^\d{5}$/.test(c) && isAllowedCoverageDistrictCode(c));
  const fc = buildMobileDistrictCoverageGeoJson(codes);
  return NextResponse.json(fc, {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
