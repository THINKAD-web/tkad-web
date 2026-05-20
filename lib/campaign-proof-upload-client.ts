import { uploadToCloudinary } from "@/lib/media-application-upload";

export type ProofUploadSign = {
  timestamp: number;
  signature: string;
  folder: string;
  cloudName: string;
  apiKey: string;
  campaignId?: string;
};

export async function fetchProofUploadSign(params: {
  campaignId?: string;
  token?: string;
}): Promise<ProofUploadSign> {
  const res = await fetch("/api/campaign-proof/upload-sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = (await res.json()) as ProofUploadSign & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Sign failed");
  return data;
}

export async function submitProofPhoto(params: {
  campaignId?: string;
  token?: string;
  imageUrl: string;
  mediaName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capturedAt?: string;
  uploadSource?: "mobile" | "qr" | "admin";
}): Promise<{ ok: boolean; photo?: { id: string; imageUrl: string } }> {
  const res = await fetch("/api/campaign-proof/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? "Submit failed");
  }
  return json;
}

export async function uploadProofFile(
  file: File,
  signParams: { campaignId?: string; token?: string },
  meta: {
    mediaName?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    capturedAt?: Date;
    uploadSource?: "mobile" | "qr" | "admin";
  },
) {
  const sign = await fetchProofUploadSign(signParams);
  const imageUrl = await uploadToCloudinary(file, sign);
  return submitProofPhoto({
    ...signParams,
    imageUrl,
    mediaName: meta.mediaName,
    latitude: meta.latitude,
    longitude: meta.longitude,
    capturedAt: (meta.capturedAt ?? new Date()).toISOString(),
    uploadSource: meta.uploadSource,
  });
}

export function readGeolocation(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  });
}
