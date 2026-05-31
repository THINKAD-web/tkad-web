import { Prisma } from "@prisma/client";

/** 매체 복수 설치 지점 — `Media.installLocations` JSON 배열 항목 */
export type MediaInstallLocation = {
  label: string;
  location?: string;
  latitude: number;
  longitude: number;
};

export type MediaInstallLocationInput = {
  label?: string | null;
  location?: string | null;
  latitude?: unknown;
  longitude?: unknown;
};

function finiteCoord(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** API·Prisma JSON → 정규화된 설치 지점 배열 */
export function parseMediaInstallLocations(raw: unknown): MediaInstallLocation[] {
  if (!Array.isArray(raw)) return [];
  const out: MediaInstallLocation[] = [];
  for (const row of raw) {
    if (row === null || typeof row !== "object" || Array.isArray(row)) continue;
    const o = row as MediaInstallLocationInput;
    const lat = finiteCoord(o.latitude);
    const lng = finiteCoord(o.longitude);
    if (lat == null || lng == null) continue;
    const label = typeof o.label === "string" ? o.label.trim() : "";
    const location =
      typeof o.location === "string" ? o.location.trim() || undefined : undefined;
    out.push({
      label: label || `지점 ${out.length + 1}`,
      location,
      latitude: lat,
      longitude: lng,
    });
  }
  return out;
}

/** 어드민 폼 행 → 저장용 JSON (유효 좌표만) */
export function normalizeInstallLocationsFromInput(
  rows: MediaInstallLocationInput[],
): MediaInstallLocation[] | null {
  const parsed = parseMediaInstallLocations(rows);
  return parsed.length > 0 ? parsed : null;
}

/** 공개 카탈로그 대표 핀 — 복수 지점이면 중심, 없으면 null */
export function centroidOfInstallLocations(
  points: MediaInstallLocation[],
): { latitude: number; longitude: number } | null {
  if (points.length === 0) return null;
  const sum = points.reduce(
    (a, p) => ({
      latitude: a.latitude + p.latitude,
      longitude: a.longitude + p.longitude,
    }),
    { latitude: 0, longitude: 0 },
  );
  return {
    latitude: sum.latitude / points.length,
    longitude: sum.longitude / points.length,
  };
}

/** PATCH/POST body.installLocations */
export function parseInstallLocationsBody(
  raw: unknown,
):
  | { ok: true; value: MediaInstallLocation[] | null }
  | { ok: false; error: string } {
  if (raw === undefined) {
    return { ok: false, error: "internal: use only when key present" };
  }
  if (raw === null) return { ok: true, value: null };
  if (!Array.isArray(raw)) {
    return { ok: false, error: "installLocations must be an array or null" };
  }
  return { ok: true, value: normalizeInstallLocationsFromInput(raw) };
}

/** Prisma create/update — 빈 배열·null 은 JSON null */
export function installLocationsForPrisma(
  value: MediaInstallLocation[] | null,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === null || value.length === 0) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

/** 저장 시 `latitude`/`longitude` 와 `installLocations` 동기화 */
export function resolveMediaCoordsForSave(input: {
  installLocations: MediaInstallLocation[] | null;
  latitude: number | null;
  longitude: number | null;
}): {
  installLocations: MediaInstallLocation[] | null;
  latitude: number | null;
  longitude: number | null;
} {
  const installs = input.installLocations;
  if (installs && installs.length > 0) {
    const c = centroidOfInstallLocations(installs)!;
    return {
      installLocations: installs,
      latitude: c.latitude,
      longitude: c.longitude,
    };
  }
  return {
    installLocations: null,
    latitude: input.latitude,
    longitude: input.longitude,
  };
}
