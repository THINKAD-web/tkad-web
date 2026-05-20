import type { SignedUploadParams } from "@/lib/cloudinary-sign";
import { uploadToCloudinary } from "@/lib/media-application-upload";

export async function fetchMediaOwnerProofUploadSign(
  campaignId: string,
): Promise<SignedUploadParams> {
  const res = await fetch(
    `/api/media-owner/campaigns/${campaignId}/proofs/upload-sign`,
    { method: "POST" },
  );
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? "업로드 서명 실패");
  }
  return json as SignedUploadParams;
}

export async function uploadOwnerProofImage(
  campaignId: string,
  file: File,
): Promise<string> {
  const sign = await fetchMediaOwnerProofUploadSign(campaignId);
  return uploadToCloudinary(file, sign);
}
