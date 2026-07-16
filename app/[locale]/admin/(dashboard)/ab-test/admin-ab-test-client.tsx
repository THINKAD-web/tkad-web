"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AbEventStats } from "@/lib/ab-test-db";

export default function AdminAbTestClient() {
  const [stats, setStats] = useState<AbEventStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ab-test", { credentials: "include" });
      const data = (await res.json()) as { stats?: AbEventStats; error?: string };
      if (!res.ok) throw new Error(data.error ?? "load failed");
      setStats(data.stats ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (action: string, variant?: "a" | "b") => {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch("/api/admin/ab-test", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, variant }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
    } finally {
      setBusy(null);
    }
  };

  const a = stats?.variants.find((v) => v.variant === "a");
  const b = stats?.variants.find((v) => v.variant === "b");

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">A/B 테스트</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            히어로 CTA — A: 지금 시작하기 / B: 무료 견적 받기 (미들웨어 비활성 ·
            쿠키 <code className="rounded bg-muted px-1">tkad_ab_variant</code>{" "}
            미설정)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30">
        <CardContent className="pt-6 text-sm text-amber-950 dark:text-amber-100">
          <p className="font-semibold">현재 실험 비활성</p>
          <p className="mt-1 text-amber-900/90 dark:text-amber-100/80">
            히어로 CTA A/B는 공개 UI에 연결되어 있지 않으며, 미들웨어 쿠키
            배정도 중단되었습니다. 아래 통계·승자 고정은 DB 기록용이며, 승자를
            바꿔도 방문자 variant는 자동 반영되지 않습니다. 실험을 다시 켤 때는
            UI 연동과 함께 미들웨어 또는 Edge Config 경로를 복구하세요.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">실험 상태</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            세대: <strong>{stats?.generation ?? "—"}</strong>
          </p>
          <p>
            고정 variant:{" "}
            <strong>
              {stats?.forcedVariant
                ? stats.forcedVariant.toUpperCase()
                : "없음 (DB만, 미들웨어 미적용)"}
            </strong>
          </p>
          <p className="text-xs text-muted-foreground">
            과거 미리보기 링크 (현재 미적용):{" "}
            <a href="/ko?v=a" className="underline">
              /ko?v=a
            </a>{" "}
            ·{" "}
            <a href="/ko?v=b" className="underline">
              /ko?v=b
            </a>
          </p>
        </CardContent>
      </Card>

      {loading && !stats ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          불러오는 중…
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(["a", "b"] as const).map((key) => {
            const row = key === "a" ? a : b;
            const label =
              key === "a" ? "A안 — 지금 시작하기" : "B안 — 무료 견적 받기";
            return (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="text-base">{label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p>
                    히어로 노출:{" "}
                    <span className="font-bold tabular-nums">
                      {row?.impressions ?? 0}
                    </span>
                  </p>
                  <p>
                    CTA 클릭:{" "}
                    <span className="font-bold tabular-nums">
                      {row?.ctaClicks ?? 0}
                    </span>
                  </p>
                  <p>
                    클릭률 (CTR):{" "}
                    <span className="font-bold tabular-nums">
                      {(row?.ctr ?? 0).toFixed(2)}%
                    </span>
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">승자 적용 · 다음 테스트</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!!busy}
            onClick={() => void runAction("declare_winner", "a")}
          >
            {busy === "declare_winner" ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Trophy className="mr-1.5 h-4 w-4" />
            )}
            A안 승리 (전체 A 고정)
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!!busy}
            onClick={() => void runAction("declare_winner", "b")}
          >
            B안 승리 (전체 B 고정)
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!!busy}
            onClick={() => void runAction("start_next_test")}
          >
            다음 테스트 시작 (50:50 재개)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
