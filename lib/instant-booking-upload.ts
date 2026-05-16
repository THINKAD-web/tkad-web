export type InstantBookingCreativeUploadResult = {
  secureUrl: string;
  publicId: string;
  resourceType: "image" | "video";
};

export async function uploadInstantBookingCreative(
  file: File,
  signEndpoint = "/api/instant-bookings/upload-sign"
): Promise<InstantBookingCreativeUploadResult> {
  const signRes = await fetch(signEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!signRes.ok) {
    const err = (await signRes.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "업로드 서명을 받지 못했습니다.");
  }
  const sign = (await signRes.json()) as {
    cloudName: string;
    apiKey: string;
    timestamp: number;
    signature: string;
    folder: string;
  };

  const isVideo = file.type.startsWith("video/");
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sign.apiKey);
  form.append("timestamp", String(sign.timestamp));
  form.append("signature", sign.signature);
  form.append("folder", sign.folder);
  if (isVideo) {
    form.append("resource_type", "video");
  }

  const uploadUrl = isVideo
    ? `https://api.cloudinary.com/v1_1/${sign.cloudName}/video/upload`
    : `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`;

  const uploadRes = await fetch(uploadUrl, { method: "POST", body: form });
  const data = (await uploadRes.json()) as {
    secure_url?: string;
    public_id?: string;
    error?: { message?: string };
  };
  if (!uploadRes.ok || !data.secure_url) {
    throw new Error(data.error?.message ?? "소재 업로드에 실패했습니다.");
  }

  return {
    secureUrl: data.secure_url,
    publicId: data.public_id ?? "",
    resourceType: isVideo ? "video" : "image",
  };
}
