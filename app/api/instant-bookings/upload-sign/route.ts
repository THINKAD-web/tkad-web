import { NextResponse } from "next/server";
import { signUploadParams } from "@/lib/cloudinary-sign";

const FOLDER = "tkad/instant-bookings";

export async function POST() {
  try {
    const signed = signUploadParams(FOLDER);
    if (!signed) {
      return NextResponse.json(
        { error: "Cloudinary가 설정되지 않았습니다." },
        { status: 503 },
      );
    }
    return NextResponse.json(signed);
  } catch (e) {
    const message = e instanceof Error ? e.message : "서명 생성 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
