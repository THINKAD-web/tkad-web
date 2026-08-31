"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MediaMetricsFieldWarning } from "@/lib/media-metrics-write";

type Props = {
  warnings: MediaMetricsFieldWarning[];
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function MetricsWriteWarningsModal({
  warnings,
  busy,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={busy ? undefined : onCancel}
        aria-hidden
      />
      <Card className="relative z-10 w-full max-w-lg border-amber-200 bg-card shadow-2xl">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            저장 전 메트릭 확인
          </CardTitle>
          <p className="text-sm font-normal text-muted-foreground">
            아래 경고를 확인한 뒤에만 저장됩니다. 네트워크·패키지 규모를 판매단위
            1개에 넣은 것은 아닌지 검토하세요.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="max-h-[40vh] space-y-2 overflow-y-auto text-sm">
            {warnings.map((w, i) => (
              <li
                key={`${w.code}-${i}`}
                className="rounded-md border border-amber-200/80 bg-amber-50 px-3 py-2 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-50"
              >
                <span className="font-mono tkad-type-caption uppercase tracking-wide text-amber-700 dark:text-amber-300">
                  {w.field} · {w.code}
                </span>
                <p className="mt-1 leading-snug">{w.message}</p>
              </li>
            ))}
          </ul>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={busy}
            >
              취소
            </Button>
            <Button type="button" onClick={onConfirm} disabled={busy}>
              확인 후 저장
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
