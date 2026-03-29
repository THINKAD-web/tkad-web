"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bell, MessageSquare, StickyNote, UserRound } from "lucide-react";

type AccountRow = {
  id: string;
  email: string;
  company: string;
  name: string;
  phone: string | null;
  _count: { contactLogs: number; notes: number; followUps: number };
};

export default function AdminCrmRecordsPage() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    contactLogs: { id: string; channel: string; summary: string; createdAt: string }[];
    notes: { id: string; body: string; updatedAt: string }[];
    followUps: {
      id: string;
      title: string;
      dueAt: string;
      doneAt: string | null;
    }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [newAcc, setNewAcc] = useState({
    email: "",
    company: "",
    name: "",
    phone: "",
  });
  const [log, setLog] = useState({ channel: "call", summary: "" });
  const [note, setNote] = useState("");
  const [fu, setFu] = useState({ title: "", dueAt: "", remindEmail: "" });

  const loadList = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/crm/accounts");
      const data = (await res.json()) as {
        accounts?: AccountRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "fail");
      setAccounts(data.accounts ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "error");
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const loadOne = async (id: string) => {
    setSel(id);
    const res = await fetch(`/api/admin/crm/accounts/${id}`);
    const data = (await res.json()) as {
      account?: {
        contactLogs: { id: string; channel: string; summary: string; createdAt: string }[];
        notes: { id: string; body: string; updatedAt: string }[];
        followUps: {
          id: string;
          title: string;
          dueAt: string;
          doneAt: string | null;
        }[];
      };
    };
    if (data.account) {
      setDetail({
        contactLogs: data.account.contactLogs.map((x) => ({
          ...x,
          createdAt: new Date(x.createdAt).toISOString().slice(0, 16),
        })),
        notes: data.account.notes.map((x) => ({
          ...x,
          updatedAt: new Date(x.updatedAt).toISOString().slice(0, 16),
        })),
        followUps: data.account.followUps.map((x) => ({
          ...x,
          dueAt: new Date(x.dueAt).toISOString().slice(0, 16),
        })),
      });
    }
  };

  const createAccount = async () => {
    await fetch("/api/admin/crm/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAcc),
    });
    setNewAcc({ email: "", company: "", name: "", phone: "" });
    await loadList();
  };

  const addLog = async () => {
    if (!sel || !log.summary) return;
    await fetch(`/api/admin/crm/accounts/${sel}/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(log),
    });
    setLog({ channel: "call", summary: "" });
    await loadOne(sel);
    await loadList();
  };

  const addNote = async () => {
    if (!sel || !note.trim()) return;
    await fetch(`/api/admin/crm/accounts/${sel}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: note }),
    });
    setNote("");
    await loadOne(sel);
    await loadList();
  };

  const addFollowUp = async () => {
    if (!sel || !fu.title || !fu.dueAt) return;
    await fetch(`/api/admin/crm/accounts/${sel}/followups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: fu.title,
        dueAt: new Date(fu.dueAt).toISOString(),
        remindEmail: fu.remindEmail || undefined,
      }),
    });
    setFu({ title: "", dueAt: "", remindEmail: "" });
    await loadOne(sel);
    await loadList();
  };

  const doneFollowUp = async (id: string) => {
    await fetch(`/api/admin/crm/followups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: true }),
    });
    if (sel) await loadOne(sel);
    await loadList();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-navy">CRM · 고객 히스토리</h2>
        <p className="text-sm text-muted-foreground">
          연락 기록, 메모, 팔로업(일정).           마감일이 서울 기준 오늘인 팔로업은{" "}
          <code className="text-xs">/api/cron/followup-reminders</code>가
          알림 이메일로 발송합니다(하루 1회). 일일 다이제스트에도 요약됩니다.
        </p>
      </div>
      {err ? (
        <p className="text-sm text-red-600">{err}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">고객사 추가</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            placeholder="이메일"
            value={newAcc.email}
            onChange={(e) =>
              setNewAcc((a) => ({ ...a, email: e.target.value }))
            }
          />
          <Input
            placeholder="회사"
            value={newAcc.company}
            onChange={(e) =>
              setNewAcc((a) => ({ ...a, company: e.target.value }))
            }
          />
          <Input
            placeholder="담당자"
            value={newAcc.name}
            onChange={(e) => setNewAcc((a) => ({ ...a, name: e.target.value }))}
          />
          <Input
            placeholder="전화"
            value={newAcc.phone}
            onChange={(e) =>
              setNewAcc((a) => ({ ...a, phone: e.target.value }))
            }
          />
          <Button type="button" className="bg-navy" onClick={createAccount}>
            저장
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">고객 목록</CardTitle>
            <Button variant="outline" size="sm" type="button" onClick={loadList}>
              새로고침
            </Button>
          </CardHeader>
          <CardContent className="max-h-[480px] space-y-2 overflow-y-auto text-sm">
            {loading ? (
              <p className="text-muted-foreground">불러오는 중…</p>
            ) : accounts.length === 0 ? (
              <p className="text-muted-foreground">데이터가 없습니다.</p>
            ) : (
              accounts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => loadOne(a.id)}
                  className={`w-full rounded-lg border p-3 text-left ${
                    sel === a.id ? "border-gold bg-gold/5" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-navy">
                    <UserRound className="h-4 w-4" />
                    {a.company}
                  </div>
                  <p className="text-xs text-muted-foreground">{a.email}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="secondary">로그 {a._count.contactLogs}</Badge>
                    <Badge variant="secondary">메모 {a._count.notes}</Badge>
                    <Badge variant="secondary">
                      팔로업 {a._count.followUps}
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">히스토리 & 팔로업</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!sel || !detail ? (
              <p className="text-sm text-muted-foreground">
                왼쪽에서 고객을 선택하세요.
              </p>
            ) : (
              <>
                <div>
                  <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold">
                    <MessageSquare className="h-4 w-4" />
                    연락 기록
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <select
                      className="rounded border px-2 py-1 text-sm"
                      value={log.channel}
                      onChange={(e) =>
                        setLog((l) => ({ ...l, channel: e.target.value }))
                      }
                    >
                      <option value="call">전화</option>
                      <option value="email">메일</option>
                      <option value="meeting">미팅</option>
                      <option value="kakao">카카오</option>
                      <option value="other">기타</option>
                    </select>
                    <Input
                      className="min-w-[200px] flex-1"
                      placeholder="요약"
                      value={log.summary}
                      onChange={(e) =>
                        setLog((l) => ({ ...l, summary: e.target.value }))
                      }
                    />
                    <Button type="button" size="sm" onClick={addLog}>
                      추가
                    </Button>
                  </div>
                  <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs">
                    {detail.contactLogs.map((x) => (
                      <li key={x.id} className="rounded bg-slate-50 p-2">
                        <span className="font-medium">{x.channel}</span> ·{" "}
                        {x.summary}
                        <span className="text-muted-foreground">
                          {" "}
                          ({x.createdAt})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold">
                    <StickyNote className="h-4 w-4" />
                    메모
                  </h3>
                  <textarea
                    className="mb-2 w-full rounded border border-slate-200 p-2 text-sm"
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="내부 메모…"
                  />
                  <Button type="button" size="sm" onClick={addNote}>
                    메모 저장
                  </Button>
                  <ul className="mt-2 space-y-1 text-xs">
                    {detail.notes.map((x) => (
                      <li key={x.id} className="rounded border p-2">
                        {x.body}
                        <span className="text-muted-foreground">
                          {" "}
                          ({x.updatedAt})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold">
                    <Bell className="h-4 w-4" />
                    팔로업
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      placeholder="제목"
                      value={fu.title}
                      onChange={(e) =>
                        setFu((f) => ({ ...f, title: e.target.value }))
                      }
                    />
                    <Input
                      type="datetime-local"
                      value={fu.dueAt}
                      onChange={(e) =>
                        setFu((f) => ({ ...f, dueAt: e.target.value }))
                      }
                    />
                    <Input
                      className="sm:col-span-2"
                      placeholder="알림 이메일 (선택)"
                      value={fu.remindEmail}
                      onChange={(e) =>
                        setFu((f) => ({ ...f, remindEmail: e.target.value }))
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-2"
                    onClick={addFollowUp}
                  >
                    팔로업 등록
                  </Button>
                  <ul className="mt-2 space-y-2 text-xs">
                    {detail.followUps.map((x) => (
                      <li
                        key={x.id}
                        className="flex items-center justify-between gap-2 rounded border p-2"
                      >
                        <div>
                          <p className="font-medium">{x.title}</p>
                          <p className="text-muted-foreground">{x.dueAt}</p>
                        </div>
                        {!x.doneAt ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => doneFollowUp(x.id)}
                          >
                            완료
                          </Button>
                        ) : (
                          <Badge>완료</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
