"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CrmPipelineBoard } from "@/components/admin/crm-pipeline-board";
import { Bell } from "lucide-react";

type AlertRow = {
  type: string;
  message: string;
  company: string;
  days: number;
};

export default function AdminPipelinePage() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);

  const loadAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/crm/alerts");
      const data = (await res.json()) as { alerts?: AlertRow[] };
      if (res.ok) setAlerts(data.alerts ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">영업 파이프라인</h1>
        <p className="text-muted-foreground text-sm">
          카드를 드래그하여 단계를 이동하세요. 단계별 예상 금액 합계가 표시됩니다.
        </p>
      </div>

      {alerts.length > 0 ? (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" />
              팔로업 알림 ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {alerts.slice(0, 8).map((a, i) => (
              <p key={`${a.type}-${i}`}>{a.message}</p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <CrmPipelineBoard />
    </div>
  );
}
