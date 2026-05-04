"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

type Item = {
  id: string;
  name: string;
  location: string;
  region: string;
  type: string;
  price: number;
  image: string | null;
  visibilityScore: number;
  updatedAt: string;
};

type Status = "pending" | "review" | "verified";

const TABS: { key: Status; label: string; icon: typeof Clock }[] = [
  { key: "pending", label: "검증 대기", icon: Clock },
  { key: "review", label: "검토 중", icon: RefreshCw },
  { key: "verified", label: "검증 완료", icon: ShieldCheck },
];

function formatKRW(v: number): string {
  return `₩${new Intl.NumberFormat("ko-KR").format(v)}`;
}

function ScoreBadge({ score }: { score: number }) {
  if (score >= 4) return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">🛡️ Verified {score}/5</Badge>;
  if (score < 0) return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">✕ Rejected</Badge>;
  if (score === 0) return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">⏳ Pending</Badge>;
  return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">🔄 Review {score}/5</Badge>;
}

export default function VerificationQueueClient() {
  const [tab, setTab] = useState<Status>("pending");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const load = useCallback(async (status: Status) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/verification?status=${status}`, { cache: "no-store" });
      const data = await res.json();
      if (data.ok) setItems(data.data.items);
      else setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  async function action(mediaId: string, act: "approve" | "reject" | "review") {
    setSubmitting(mediaId);
    try {
      const res = await fetch("/api/admin/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId, action: act, note: notes[mediaId] }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((x) => x.id !== mediaId));
        setNotes((prev) => {
          const { [mediaId]: _, ...rest } = prev;
          return rest;
        });
      }
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <>
      <nav
        role="tablist"
        className="flex w-fit gap-1 overflow-x-auto rounded-xl bg-muted p-1 dark:bg-card/10"
      >
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="mt-5">
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">불러오는 중…</div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-sm font-medium text-foreground">해당 상태의 매체가 없습니다</p>
              <p className="mt-1 text-xs text-muted-foreground">다른 탭을 확인해보세요.</p>
            </CardContent>
          </Card>
        ) : (
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {items.map((m) => (
              <li key={m.id}>
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <div className="flex gap-3">
                      {m.image ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={m.image}
                          alt=""
                          className="w-20 h-20 object-cover rounded-lg flex-shrink-0 border border-slate-200"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-slate-100 rounded-lg flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <CardTitle className="text-sm truncate">{m.name}</CardTitle>
                          <ScoreBadge score={m.visibilityScore} />
                        </div>
                        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {m.location}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{m.type}</span>
                          <span className="text-sm font-semibold text-primary tabular-nums">
                            {formatKRW(m.price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <textarea
                      placeholder="관리자 메모 (선택) — 예: 조도·가시성 현장 확인 완료"
                      value={notes[m.id] ?? ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [m.id]: e.target.value }))}
                      rows={2}
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        disabled={submitting === m.id}
                        onClick={() => action(m.id, "approve")}
                        className="flex-1"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        승인
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={submitting === m.id}
                        onClick={() => action(m.id, "review")}
                        className="flex-1"
                      >
                        <RefreshCw className="w-4 h-4" />
                        검토 중
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={submitting === m.id}
                        onClick={() => action(m.id, "reject")}
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4" />
                        거절
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
