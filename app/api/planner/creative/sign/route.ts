import { NextResponse } from "next/server";
import {
  signUploadParams,
  isCloudinaryConfigured,
} from "@/lib/cloudinary-sign";

export const dynamic = "force-dynamic";

/**
 * 공개 플래너 로고 업로드용 signed upload 파라미터 발급.
 * 관리자 업로드와 분리된 전용 폴더 (`tkad/planner/creative`) 로 격리.
 *
 * 보안 메모: 공개 엔드포인트이므로 악의적 남용을 막기 위해 Cloudinary upload
 * preset 에 `resource_type=image`·`max_file_size` 제한을 두는 것을 권장.
 * 서명 자체는 timestamp + folder 조합이라 재생 공격 창이 짧음.
 */
export async function POST() {
  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "Cloudinary not configured" },
      { status: 503 },
    );
  }
  const params = signUploadParams("tkad/planner/creative");
  if (!params) {
    return NextResponse.json(
      { error: "Cloudinary sign failed" },
      { status: 503 },
    );
  }
  return NextResponse.json(params);
}
