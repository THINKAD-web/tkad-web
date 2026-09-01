import type { MediaApplicationStatus } from "@prisma/client";
import { normalizeCatalogMediaType } from "@/lib/catalog-media-type";

export const MEDIA_APPLICATION_MEDIA_TYPES = [
  "dooh",
  "static",
  "other",
] as const;

export type MediaApplicationMediaType =
  (typeof MEDIA_APPLICATION_MEDIA_TYPES)[number];

export const MEDIA_APPLICATION_STATUSES: MediaApplicationStatus[] = [
  "PENDING",
  "REVIEWING",
  "APPROVED",
  "REJECTED",
];

export type MediaApplicationSubmitBody = {
  companyName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  mediaName: string;
  mediaType: MediaApplicationMediaType;
  address: string;
  addressDetail?: string;
  zonecode?: string;
  latitude?: number | null;
  longitude?: number | null;
  city?: string;
  district?: string;
  widthCm?: number | null;
  heightCm?: number | null;
  isDigital: boolean;
  operatingHours?: string;
  hasLighting: boolean;
  dailyFootfall?: number | null;
  monthlyPrice: number;
  minFlightDays?: number | null;
  photoFrontUrl: string;
  photoSideUrl: string;
  photoNightUrl: string;
  notes?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d\-+() ]{8,}$/;
const URL_RE = /^https?:\/\/.+/i;

export function labelMediaApplicationStatus(
  status: MediaApplicationStatus,
  isKo: boolean,
): string {
  const map: Record<MediaApplicationStatus, { ko: string; en: string }> = {
    PENDING: { ko: "접수", en: "Pending" },
    REVIEWING: { ko: "심사 중", en: "Reviewing" },
    APPROVED: { ko: "승인", en: "Approved" },
    REJECTED: { ko: "반려", en: "Rejected" },
  };
  return isKo ? map[status].ko : map[status].en;
}

export function labelMediaApplicationType(
  type: string,
  isKo: boolean,
): string {
  switch (type) {
    case "digital":
      return isKo ? "디지털" : "Digital";
    case "static":
      return isKo ? "고정형" : "Static";
    default:
      return isKo ? "기타" : "Other";
  }
}

export function parseMediaApplicationSubmit(
  raw: unknown,
):
  | { ok: true; data: MediaApplicationSubmitBody }
  | { ok: false; error: string; fields?: string[] } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Invalid body" };
  }
  const b = raw as Record<string, unknown>;
  const str = (k: string) =>
    typeof b[k] === "string" ? (b[k] as string).trim() : "";
  const bool = (k: string) => Boolean(b[k]);
  const optNum = (k: string): number | null => {
    const v = b[k];
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const mediaTypeRaw = str("mediaType").toLowerCase();
  const normalizedType = normalizeCatalogMediaType(mediaTypeRaw);
  const mediaType =
    normalizedType === "dooh" || normalizedType === "static"
      ? normalizedType
      : mediaTypeRaw === "other"
        ? ("other" as const)
        : null;

  const fields: string[] = [];
  if (!str("companyName")) fields.push("companyName");
  if (!str("contactName")) fields.push("contactName");
  if (!str("contactPhone") || !PHONE_RE.test(str("contactPhone")))
    fields.push("contactPhone");
  const email = str("contactEmail");
  if (!email || !EMAIL_RE.test(email)) fields.push("contactEmail");
  if (!str("mediaName")) fields.push("mediaName");
  if (!mediaType) fields.push("mediaType");
  if (!str("address")) fields.push("address");
  const monthlyPrice = optNum("monthlyPrice");
  if (monthlyPrice == null || monthlyPrice < 0) fields.push("monthlyPrice");
  for (const photo of ["photoFrontUrl", "photoSideUrl", "photoNightUrl"] as const) {
    const u = str(photo);
    if (!u || !URL_RE.test(u)) fields.push(photo);
  }

  if (fields.length > 0) {
    return { ok: false, error: "validation_failed", fields };
  }

  return {
    ok: true,
    data: {
      companyName: str("companyName"),
      contactName: str("contactName"),
      contactPhone: str("contactPhone"),
      contactEmail: email,
      mediaName: str("mediaName"),
      mediaType: mediaType!,
      address: str("address"),
      addressDetail: str("addressDetail") || undefined,
      zonecode: str("zonecode") || undefined,
      latitude: optNum("latitude"),
      longitude: optNum("longitude"),
      city: str("city") || undefined,
      district: str("district") || undefined,
      widthCm: optNum("widthCm"),
      heightCm: optNum("heightCm"),
      isDigital: bool("isDigital"),
      operatingHours: str("operatingHours") || undefined,
      hasLighting: bool("hasLighting"),
      dailyFootfall: optNum("dailyFootfall"),
      monthlyPrice: monthlyPrice!,
      minFlightDays: optNum("minFlightDays"),
      photoFrontUrl: str("photoFrontUrl"),
      photoSideUrl: str("photoSideUrl"),
      photoNightUrl: str("photoNightUrl"),
      notes: str("notes") || undefined,
    },
  };
}
