import type { AdminMediaLayerBadges } from "@/lib/admin-media-dto";
import { LOCKED_FIELD_TOOLTIP } from "@/lib/media/locked-fields";

export function ReliabilityBadge({
  grade,
}: {
  grade: "A" | "B" | "C";
}) {
  const config = {
    A: { color: "bg-green-100 text-green-800", label: "A (실측)" },
    B: { color: "bg-blue-100 text-blue-800", label: "B (공공데이터 추정)" },
    C: { color: "bg-gray-100 text-gray-600", label: "C (레거시/대체)" },
  } as const;
  return (
    <span
      className={`inline-flex text-xs px-2 py-0.5 rounded ${config[grade].color}`}
    >
      {config[grade].label}
    </span>
  );
}

export function LegacyValueBadge() {
  return (
    <span
      className="inline-flex text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800"
      title="아직 실제 계산이 수행되지 않은 레거시 값입니다. 향후 자동 갱신됩니다."
    >
      레거시 값
    </span>
  );
}

export function DimensionUnknownBadge() {
  return (
    <span
      className="inline-flex text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-800"
      title="매체 규격(가로×세로) 정보가 없어 노출량 계산이 제한됩니다. 매체사 확인 필요."
    >
      규격 미확인
    </span>
  );
}

export function CpmUnknownBadge() {
  return (
    <span
      className="inline-flex text-xs px-2 py-0.5 rounded bg-red-50 text-red-700"
      title="CPM(단가) 정보가 없습니다. 매체사 계약서 확인 필요."
    >
      가격 정보 없음
    </span>
  );
}

export function MediaLayerBadges({
  badges,
}: {
  badges: AdminMediaLayerBadges | null | undefined;
}) {
  if (!badges) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {badges.reliabilityGrade ? (
        <ReliabilityBadge grade={badges.reliabilityGrade} />
      ) : null}
      {badges.modelVersion === "legacy-migration-v1" ? (
        <LegacyValueBadge />
      ) : null}
      {badges.dimensionSource === "UNKNOWN" ? <DimensionUnknownBadge /> : null}
      {badges.legacyCpm === null ? <CpmUnknownBadge /> : null}
    </span>
  );
}

export function LockedComputedFieldBadge() {
  return (
    <span
      className="ml-1 inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
      title={LOCKED_FIELD_TOOLTIP}
    >
      🔒 자동 계산
    </span>
  );
}

export const LOCKED_INPUT_CLASS =
  "bg-muted/60 text-muted-foreground cursor-not-allowed";
