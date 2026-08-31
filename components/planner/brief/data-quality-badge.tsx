"use client";

/**
 * 데이터 신뢰도 배지 — [실측] / [추정] / [산정 중].
 *
 * **화면이 임의로 판정하지 않는다.** 값과 함께 올라온 `basis`
 * (`lib/metrics/defaults.ts`)를 읽어서 그대로 렌더한다. 값이 없으면
 * (커버리지 인구 미연동 등) [산정 중] 이다.
 *
 *   measured → [실측]  DB 실측값
 *   derived  → [추정]  매체 사양·등록가에서 계산 (직접 측정 아님)
 *   parsed   → [추정]  등록 targetAge 파싱
 *   default  → [추정]  유형별 기본 상수로 대체
 *   null     → [산정 중]
 *
 * 설명은 예전에 `title=` 속성뿐이었다 — 터치 기기에는 hover 가 없어서
 * 모바일 사용자는 배지 뜻을 볼 방법이 아예 없었다. 지금은 눌러서 여는
 * 버튼이고, `title` 은 데스크톱 hover 용으로 남겨 둔다.
 *
 * 문구는 `lib/planner/brief/data-quality-copy.ts` 가 SSOT.
 */

import { useEffect, useId, useRef, useState } from "react";
import type { MetricBasis } from "@/lib/metrics/defaults";
import {
  basisToBadge,
  type BadgeKind,
} from "@/lib/planner/brief/basis-to-badge";
import {
  DATA_QUALITY_LABELS,
  dataQualityDetail,
} from "@/lib/planner/brief/data-quality-copy";

export { basisToBadge, type BadgeKind };

const TONE: Record<BadgeKind, string> = {
  measured:
    "border-emerald-400/50 bg-emerald-400/10 text-emerald-700 dark:text-emerald-400",
  estimated:
    "border-amber-400/50 bg-amber-400/10 text-amber-700 dark:text-amber-400",
  pending:
    "border-zinc-400/50 bg-zinc-400/10 text-zinc-600 dark:text-zinc-400",
};

export function DataQualityBadge({
  basis,
  isKo,
  className = "",
}: {
  /** null = 산정 불가 */
  basis: MetricBasis | null | undefined;
  isKo: boolean;
  className?: string;
}) {
  const kind = basisToBadge(basis);
  const label = DATA_QUALITY_LABELS[kind][isKo ? "ko" : "en"];
  const detail = dataQualityDetail(basis, isKo);

  const [open, setOpen] = useState(false);
  /**
   * 말풍선을 배지의 어느 쪽에 붙일지. 지표 패널에서는 배지가 오른쪽 끝에
   * 있어 right-0 이 맞지만, 매체 상세처럼 배지가 왼쪽에 오는 화면에서는
   * 그대로 두면 말풍선이 화면 밖으로 잘린다 — 열 때 위치를 재서 뒤집는다.
   */
  const [alignLeft, setAlignLeft] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const panelId = useId();

  const toggle = () => {
    setOpen((wasOpen) => {
      if (!wasOpen) {
        const rect = wrapRef.current?.getBoundingClientRect();
        // 오른쪽 정렬 시 말풍선(w-56 = 14rem ≈ 224px) 왼쪽 끝이 화면 밖인가
        if (rect) setAlignLeft(rect.right - 224 < 8);
      }
      return !wasOpen;
    });
  };

  // 바깥 클릭 · Esc 로 닫기 — 열려 있을 때만 리스너를 건다.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={wrapRef} className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title={detail}
        className={`inline-flex shrink-0 cursor-help items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${TONE[kind]} ${className}`}
      >
        {isKo ? `[${label}]` : label}
      </button>

      {open ? (
        <span
          id={panelId}
          role="tooltip"
          className={`absolute top-full z-30 mt-1 w-56 rounded-lg border border-border bg-popover p-2 text-[11px] font-normal leading-relaxed text-popover-foreground shadow-md ${
            alignLeft ? "left-0" : "right-0"
          }`}
        >
          <span className="mb-0.5 block font-semibold">
            {isKo ? `[${label}]` : label}
          </span>
          {detail}
        </span>
      ) : null}
    </span>
  );
}
