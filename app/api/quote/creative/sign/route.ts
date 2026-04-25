import { NextResponse } from "next/server";
import {
  isCloudinaryConfigured,
  signUploadParams,
} from "@/lib/cloudinary-sign";

export const dynamic = "force-dynamic";

/**
 * 견적 마법사 3단계 — 광고 소재 업로드용 signed upload 파라미터 발급.
 * 매체/플래너 업로드와 분리된 전용 폴더(`tkad/quote/creative`) 로 격리한다.
 *
 * 보안: 공개 엔드포인트이므로 Cloudinary upload preset 에서
 *   resource_type=image|video, max_file_size 제한을 두는 것을 권장한다.
 *   서명은 timestamp+folder 조합이라 재생 공격 창이 짧다.
 */
export async function POST() {
  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "Cloudinary not configured" },
      { status: 503 },
    );
  }
  const params = signUploadParams("tkad/quote/creative");
  if (!params) {
    return NextResponse.json(
      { error: "Cloudinary sign failed" },
      { status: 503 },
    );
  }
  return NextResponse.json(params);
}
