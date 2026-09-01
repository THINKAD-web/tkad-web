"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, Radar, SkipForward } from "lucide-react";
import {
  isAdminDatabaseError,
  parseAdminJson,
} from "@/lib/admin-fetch-json";

type LeadRow = {
  id: string;
  name: string;
  address: string;
  foundFrom: string;
  outreachStatus: string;
  contactInfo: { phone?: string; email?: string } | null;
  outreachEmail: string | null;
  emailedAt: string | null;
  emailOpenedAt: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  NEW: "신규",
  CONTACT_FOUND: "연락처",
  EMAILED: "메일 발송",
  OPENED: "오픈",
  REGISTERED: "등록",
  SKIPPED: "스킵",
};

export default function AdminPotentialMediaLeadsPage() {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState<Record<string, string>>({});
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/potential-media");
      const parsed = await parseAdminJson<{ ok?: boolean; rows?: LeadRow[] }>(res);
      if (!parsed.ok) {
        setError(
          isAdminDatabaseError(
            parsed.status,
            parsed.body as { error?: string; code?: string } | null,
          )
            ? "DB 연결을 확인하세요."
            : "목록을 불러오지 못했습니다.",
        );
        return;
      }
      setRows(parsed.data.rows ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runDiscover = async () => {
    setDiscovering(true);
    try {
      const res = await fetch("/api/admin/potential-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "discover" }),
      });
      const parsed = await parseAdminJson<{ inserted?: number }>(res);
      if (parsed.ok) {
        await load();
        alert(`신규 ${parsed.data.inserted ?? 0}건 저장`);
      }
    } finally {
      setDiscovering(false);
    }
  };

  const sendOutreach = async (id: string) => {
    const email = emailDraft[id]?.trim();
    if (!email) {
      alert("이메일을 입력하세요.");
      return;
    }
    setActingId(id);
    try {
      const res = await fetch(`/api/admin/potential-media/${id}/outreach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const parsed = await parseAdminJson(res);
      if (parsed.ok) await load();
      else alert("발송 실패");
    } finally {
      setActingId(null);
    }
  };

  const skipLead = async (id: string) => {
    setActingId(id);
    try {
      await fetch(`/api/admin/potential-media/${id}/skip`, { method: "POST" });
      await load();
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">매체 리드 발굴</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            카카오/구글 지도 키워드 검색 → 잠재 매체 DB → 콜드 메일 아웃리치
          </p>
        </div>
        <button
          type="button"
          onClick={() => void runDiscover()}
          disabled={discovering}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 tkad-type-title text-primary-foreground disabled:opacity-60"
        >
          {discovering ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Radar className="h-4 w-4" />
          )}
          지도 크롤링 실행
        </button>
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">불러오는 중…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">매체명</th>
                <th className="px-3 py-2">주소</th>
                <th className="px-3 py-2">출처</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">연락처</th>
                <th className="px-3 py-2">아웃리치</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const phone = r.contactInfo?.phone;
                const defaultEmail =
                  r.outreachEmail ?? r.contactInfo?.email ?? "";
                return (
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="px-3 py-3 font-medium">{r.name}</td>
                    <td className="max-w-[200px] truncate px-3 py-3 text-muted-foreground">
                      {r.address}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {r.foundFrom}
                    </td>
                    <td className="px-3 py-3">
                      {STATUS_LABEL[r.outreachStatus] ?? r.outreachStatus}
                      {r.emailOpenedAt ? (
                        <span className="ml-1 text-xs text-emerald-600">
                          · 오픈
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {phone ? <div>{phone}</div> : "—"}
                    </td>
                    <td className="px-3 py-3">
                      {r.outreachStatus === "SKIPPED" ||
                      r.outreachStatus === "REGISTERED" ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="email"
                            placeholder="email"
                            className="h-8 w-40 rounded border px-2 text-xs"
                            value={emailDraft[r.id] ?? defaultEmail}
                            onChange={(e) =>
                              setEmailDraft((d) => ({
                                ...d,
                                [r.id]: e.target.value,
                              }))
                            }
                          />
                          <button
                            type="button"
                            disabled={actingId === r.id}
                            onClick={() => void sendOutreach(r.id)}
                            className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-muted"
                          >
                            <Mail className="h-3 w-3" />
                            발송
                          </button>
                          <button
                            type="button"
                            disabled={actingId === r.id}
                            onClick={() => void skipLead(r.id)}
                            className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                          >
                            <SkipForward className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              리드가 없습니다. 「지도 크롤링 실행」을 눌러 수집하세요. (KAKAO_REST_API_KEY
              필요)
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
