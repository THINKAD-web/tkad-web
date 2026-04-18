"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, Eye, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

type InquiryStatus = "pending" | "processing" | "completed";

type Inquiry = {
  id: string;
  company: string;
  name: string;
  phone: string;
  email: string | null;
  budget: string | null;
  message: string;
  status: InquiryStatus;
  createdAt: string;
};

const statusMap: Record<InquiryStatus, { label: string; className: string }> = {
  pending:    { label: "대기",   className: "bg-amber-100 text-amber-700" },
  processing: { label: "처리중", className: "bg-blue-100 text-blue-700" },
  completed:  { label: "완료",   className: "bg-emerald-100 text-emerald-700" },
};

const PAGE_SIZE = 20;

export default function AdminInquiriesPage() {
  const [items, setItems] = useState<Inquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<InquiryStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setDbError(null);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/admin/inquiries?${params.toString()}`);
      if (res.status === 503) {
        setDbError("DATABASE_URL이 설정되지 않았습니다. .env에 DATABASE_URL을 추가하세요.");
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { items: Inquiry[]; total: number };
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      setDbError(String(e));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, search]);

  useEffect(() => { void load(); }, [load]);

  const updateStatus = useCallback(async (id: string, newStatus: InquiryStatus) => {
    setSaving(id);
    try {
      const res = await fetch("/api/admin/inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) throw new Error(await res.text());
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, status: newStatus } : i));
      setSelected((prev) => prev?.id === id ? { ...prev, status: newStatus } : prev);
    } catch (e) {
      alert("상태 변경 실패: " + String(e));
    } finally {
      setSaving(null);
    }
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (dbError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-sm font-semibold text-rose-600">DB 연결 필요</p>
          <p className="max-w-md text-xs text-muted-foreground">{dbError}</p>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" /> 재시도
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {(["all", "pending", "processing", "completed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    statusFilter === s
                      ? "bg-navy text-white"
                      : "bg-slate-100 text-muted-foreground hover:bg-slate-200"
                  }`}
                >
                  {s === "all" ? "전체" : statusMap[s].label}
                  {s !== "all" && !loading && (
                    <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">
                      {items.filter((i) => i.status === s).length}
                    </span>
                  )}
                </button>
              ))}
              <span className="ml-2 self-center text-xs text-muted-foreground">
                총 {total}건
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="회사명 또는 담당자 검색..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
              <Button variant="ghost" size="icon-xs" onClick={load} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-3">회사명</th>
                    <th className="px-4 py-3">담당자</th>
                    <th className="px-4 py-3 hidden md:table-cell">연락처</th>
                    <th className="px-4 py-3 hidden lg:table-cell">예산</th>
                    <th className="px-4 py-3">날짜</th>
                    <th className="px-4 py-3">상태</th>
                    <th className="px-4 py-3 text-center">상세</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b animate-pulse">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-3.5 rounded bg-slate-100" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                        {search ? "검색 결과가 없습니다." : "문의 내역이 없습니다."}
                      </td>
                    </tr>
                  ) : (
                    items.map((inq) => (
                      <tr
                        key={inq.id}
                        className="border-b last:border-0 hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-navy">{inq.company}</td>
                        <td className="px-4 py-3 text-muted-foreground">{inq.name}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{inq.phone}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                          {inq.budget ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(inq.createdAt).toLocaleDateString("ko-KR")}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={inq.status}
                            disabled={saving === inq.id}
                            onChange={(e) => updateStatus(inq.id, e.target.value as InquiryStatus)}
                            className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold cursor-pointer ${statusMap[inq.status].className}`}
                          >
                            <option value="pending">대기</option>
                            <option value="processing">처리중</option>
                            <option value="completed">완료</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button variant="ghost" size="icon-xs" onClick={() => setSelected(inq)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && !loading && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <span className="text-xs text-muted-foreground">
                  총 {total}건 중 {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}
                </span>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon-xs" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="icon-xs" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <Card className="relative z-10 w-full max-w-lg">
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle className="text-lg text-navy">문의 상세 정보</CardTitle>
                <p className="mt-1 text-xs font-mono text-muted-foreground">{selected.id}</p>
              </div>
              <Button variant="ghost" size="icon-xs" onClick={() => setSelected(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="회사명" value={selected.company} />
                <Field label="담당자" value={selected.name} />
                <Field label="연락처" value={selected.phone} />
                <Field label="이메일" value={selected.email ?? "—"} />
                <Field label="예산" value={selected.budget ?? "—"} />
                <Field label="접수일" value={new Date(selected.createdAt).toLocaleDateString("ko-KR")} />
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">문의 내용</span>
                <p className="mt-1 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-navy">
                  {selected.message}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">상태 변경</span>
                <select
                  value={selected.status}
                  disabled={saving === selected.id}
                  onChange={(e) => updateStatus(selected.id, e.target.value as InquiryStatus)}
                  className={`rounded-full border-0 px-3 py-1.5 text-xs font-semibold ${statusMap[selected.status].className}`}
                >
                  <option value="pending">대기</option>
                  <option value="processing">처리중</option>
                  <option value="completed">완료</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <p className="mt-0.5 text-sm font-medium text-navy">{value}</p>
    </div>
  );
}
