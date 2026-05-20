import { v2 as cloudinary } from "cloudinary";
import {
  getCloudinaryCredentials,
  isCloudinaryConfigured,
} from "@/lib/cloudinary-env";

const PROOF_FOLDER = "tkad/campaign-proofs";
/** Cloudinary named overlay: l_tkad:watermark,o_30 */
export const THINKAD_WATERMARK_OVERLAY = "tkad:watermark";

function ensureConfig() {
  const c = getCloudinaryCredentials();
  if (!c) return;
  cloudinary.config({
    cloud_name: c.cloudName,
    api_key: c.apiKey,
    api_secret: c.apiSecret,
  });
}

export function proofUploadFolder(campaignId: string): string {
  return `${PROOF_FOLDER}/${campaignId}`;
}

export function parseCloudinaryPublicId(secureUrl: string): string | null {
  try {
    const u = new URL(secureUrl);
    const marker = "/upload/";
    const idx = u.pathname.indexOf(marker);
    if (idx < 0) return null;
    let rest = u.pathname.slice(idx + marker.length);
    if (rest.startsWith("v") && /^v\d+\//.test(rest)) {
      rest = rest.replace(/^v\d+\//, "");
    }
    const withoutExt = rest.replace(/\.[a-zA-Z0-9]+$/, "");
    return decodeURIComponent(withoutExt);
  } catch {
    return null;
  }
}

function formatCapturedLabel(d: Date, isKo = true): string {
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  };
  return new Intl.DateTimeFormat(isKo ? "ko-KR" : "en-US", opts).format(d);
}

/** THINKAD 로고(l_tkad:watermark,o_30) + 촬영 일시 텍스트 */
export function buildWatermarkedTransformation(capturedAt: Date) {
  const label = formatCapturedLabel(capturedAt).replace(/,/g, " ");
  return [
    {
      overlay: THINKAD_WATERMARK_OVERLAY,
      opacity: 30,
      gravity: "south_east",
      width: 140,
      x: 20,
      y: 20,
    },
    {
      overlay: {
        font_family: "Arial",
        font_size: 22,
        text: label,
      },
      color: "white",
      gravity: "south_west",
      x: 24,
      y: 24,
      background: "rgb:000000",
      opacity: 72,
    },
  ];
}

export function buildWatermarkedDeliveryUrl(
  publicId: string,
  capturedAt: Date,
): string | null {
  if (!isCloudinaryConfigured()) return null;
  ensureConfig();
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      { width: 1200, height: 1200, crop: "fill" },
      ...buildWatermarkedTransformation(capturedAt),
    ],
  });
}

/** 원본 public_id 로 워터마크 버전을 별도 업로드해 secure_url 반환 */
export async function uploadWatermarkedCopy(params: {
  publicId: string;
  capturedAt: Date;
}): Promise<string | null> {
  if (!isCloudinaryConfigured()) return null;
  ensureConfig();
  const sourceUrl = cloudinary.url(params.publicId, { secure: true });
  try {
    const result = await cloudinary.uploader.upload(sourceUrl, {
      public_id: `${params.publicId}_wm`,
      overwrite: true,
      transformation: [
        { width: 1200, height: 1200, crop: "fill" },
        ...buildWatermarkedTransformation(params.capturedAt),
      ],
    });
    return result.secure_url ?? null;
  } catch (e) {
    console.error("[campaign-proof-cloudinary] watermark upload", e);
    return buildWatermarkedDeliveryUrl(params.publicId, params.capturedAt);
  }
}
