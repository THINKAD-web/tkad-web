"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CalendarRange,
  Camera,
  Eye,
  FileDown,
  FileText,
  Link2,
  Plus,
  Trash2,
} from "lucide-react";
import dynamic from "next/dynamic";
const CampaignReportPreview = dynamic(() => import("@/components/campaign-report-preview"), { ssr: false });

type CampaignStatus =
  | "proposal"
  | "negotiation"
  | "contract"
  | "production"
  | "airing"
  | "completed";
type FinancialDocKind = "quote" | "contract" | "invoice";
type FinancialDocStatus =
  | "draft"
  | "sent"
  | "paid"
  | "overdue"
  | "cancelled";

type CampaignRow = {
  id: string;
  name: string;
  clientCompany: string;
  clientName: string;
  clientEmail: string;
  status: CampaignStatus;
  _count: {
    scheduleEvents: number;
    financialDocs: number;
    quoteRequests: number;
  };
};

type LinkedQuoteRow = {
  id: string;
  company: string;
  name: string;
  email: string | null;
  estimatedCost: number | null;
  createdAt: string;
};

const STATUS_LABEL: Record<CampaignStatus, string> = {
  proposal: "제안",
  negotiation: "협의",
  contract: "계약",
  production: "제작",
  airing: "송출",
  completed: "완료",
};

const DOC_KIND: { value: FinancialDocKind; label: string }[] = [
  { value: "quote", label: "견적" },
  { value: "contract", label: "계약" },
  { value: "invoice", label: "청구" },
];

const DOC_STATUS_LIST: { value: FinancialDocStatus; label: string }[] = [
  { value: "draft", label: "초안" },
  { value: "sent", label: "발송" },
  { value: "paid", label: "결제완료" },
  { value: "overdue", label: "연체" },
  { value: "cancelled", label: "취소" },
];

export default function AdminCampaignsPage() {
  const pathname = usePathname();
  const adminLocale = pathname.split("/")[1] || "ko";

  const [list, setList] = useState<CampaignRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    clientCompany: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
  });

  const [events, setEvents] = useState<
    { id: string; title: string; startsAt: string; endsAt: string; kind: string }[]
  >([]);
  const [docs, setDocs] = useState<
    {
      id: string;
      kind: FinancialDocKind;
      title: string;
      amountKrw: number | null;
      status: FinancialDocStatus;
      dueDate: string | null;
    }[]
  >([]);

  const [evForm, setEvForm] = useState({
    title: "",
    startsAt: "",
    endsAt: "",
    kind: "broadcast",
  });
  const [docForm, setDocForm] = useState({
    kind: "quote" as FinancialDocKind,
    title: "",
    amountKrw: "",
    status: "draft" as FinancialDocStatus,
    dueDate: "",
  });

  const [linkedQuotes, setLinkedQuotes] = useState<LinkedQuoteRow[]>([]);
  const [unlinkedQuotes, setUnlinkedQuotes] = useState<LinkedQuoteRow[]>([]);
  const [attachQuoteId, setAttachQuoteId] = useState("");
  const [proofs, setProofs] = useState<
    { id: string; imageUrl: string; caption: string | null; createdAt: string }[]
  >([]);
  const [proofMsg, setProofMsg] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [successCaseBusy, setSuccessCaseBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/campaigns");
      const data = (await res.json()) as {
        campaigns?: CampaignRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "load failed");
      setList(data.campaigns ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "error");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadDetail = async (id: string) => {
    setSelectedId(id);
    try {
      const [cRes, uRes] = await Promise.all([
        fetch(`/api/admin/campaigns/${id}`),
        fetch("/api/admin/quote-requests?unlinked=1"),
      ]);
      const cJson = (await cRes.json()) as {
        campaign?: {
          scheduleEvents: typeof events;
          financialDocs: typeof docs;
          quoteRequests: LinkedQuoteRow[];
          proofPhotos: {
            id: string;
            imageUrl: string;
            caption: string | null;
            createdAt: string;
          }[];
        };
      };
      const uJson = (await uRes.json()) as { quotes?: LinkedQuoteRow[] };
      const c = cJson.campaign;
      if (!c) {
        setEvents([]);
        setDocs([]);
        setLinkedQuotes([]);
        setProofs([]);
        setUnlinkedQuotes(uJson.quotes ?? []);
        return;
      }
      setEvents(
        (c.scheduleEvents ?? []).map((x) => ({
          ...x,
          startsAt: new Date(x.startsAt).toISOString().slice(0, 16),
          endsAt: new Date(x.endsAt).toISOString().slice(0, 16),
        })),
      );
      setDocs(
        (c.financialDocs ?? []).map((d) => ({
          ...d,
          dueDate: d.dueDate
            ? new Date(d.dueDate).toISOString().slice(0, 10)
            : null,
        })),
      );
      setLinkedQuotes(
        (c.quoteRequests ?? []).map((q) => ({
          ...q,
          createdAt: new Date(q.createdAt).toISOString().slice(0, 16),
        })),
      );
      setProofs(
        (c.proofPhotos ?? []).map((p) => ({
          ...p,
          createdAt: new Date(p.createdAt).toISOString().slice(0, 16),
        })),
      );
      setUnlinkedQuotes(uJson.quotes ?? []);
    } catch {
      setEvents([]);
      setDocs([]);
      setLinkedQuotes([]);
      setProofs([]);
      setUnlinkedQuotes([]);
    }
  };

  const uploadProofImage = async (file: File) => {
    if (!selectedId) return;
    setProofMsg(null);
    const sigRes = await fetch("/api/admin/upload/cloudinary", {
      method: "POST",
    });
    if (!sigRes.ok) {
      setProofMsg("Cloudinary 미설정");
      return;
    }
    const sig = (await sigRes.json()) as {
      timestamp: number;
      signature: string;
      folder: string;
      cloudName: string;
      apiKey: string;
    };
    const fd = new FormData();
    fd.append("file", file);
    fd.append("api_key", sig.apiKey);
    fd.append("timestamp", String(sig.timestamp));
    fd.append("signature", sig.signature);
    fd.append("folder", sig.folder);
    const up = await fetch(
      `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
      { method: "POST", body: fd },
    );
    const upJson = (await up.json()) as {
      secure_url?: string;
      error?: { message: string };
    };
    if (!up.ok || !upJson.secure_url) {
      setProofMsg(upJson.error?.message ?? "업로드 실패");
      return;
    }
    const post = await fetch(`/api/admin/campaigns/${selectedId}/proofs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: upJson.secure_url }),
    });
    if (!post.ok) {
      setProofMsg("증빙 저장 실패");
      return;
    }
    setProofMsg("증빙이 등록되었습니다.");
    await loadDetail(selectedId);
  };

  const delProof = async (photoId: string) => {
    await fetch(`/api/admin/campaign-proof-photos/${photoId}`, {
      method: "DELETE",
    });
    if (selectedId) await loadDetail(selectedId);
  };

  const attachQuote = async () => {
    if (!selectedId || !attachQuoteId) return;
    await fetch(`/api/admin/quote-requests/${attachQuoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: selectedId }),
    });
    setAttachQuoteId("");
    await loadDetail(selectedId);
    await load();
  };

  const unlinkQuote = async (quoteId: string) => {
    await fetch(`/api/admin/quote-requests/${quoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: null }),
    });
    if (selectedId) await loadDetail(selectedId);
    await load();
  };

  const createCampaign = async () => {
    const res = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        clientCompany: form.clientCompany,
        clientName: form.clientName,
        clientEmail: form.clientEmail,
        clientPhone: form.clientPhone || undefined,
      }),
    });
    if (!res.ok) return;
    setForm({
      name: "",
      clientCompany: "",
      clientName: "",
      clientEmail: "",
      clientPhone: "",
    });
    await load();
  };

  const patchStatus = async (id: string, status: CampaignStatus) => {
    await fetch(`/api/admin/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
    if (selectedId === id) await loadDetail(id);
  };

  const downloadAiCompletionPdf = async () => {
    if (!selectedId) return;
    setPdfBusy(true);
    try {
      const res = await fetch(
        `/api/admin/campaigns/${selectedId}/generate-report`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        window.alert(j.error ?? "PDF 생성 실패");
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition");
      let name = "thinkad-campaign-completion.pdf";
      const m = cd?.match(/filename="([^"]+)"/);
      if (m?.[1]) name = m[1];
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPdfBusy(false);
    }
  };

  const createDraftSuccessCase = async () => {
    if (!selectedId) return;
    setSuccessCaseBusy(true);
    try {
      const res = await fetch(
        `/api/admin/campaigns/${selectedId}/draft-success-case`,
        { method: "POST", credentials: "include" },
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        successCaseId?: string | null;
      };
      if (!res.ok) {
        window.alert(data.error ?? "실패");
        return;
      }
      if (data.successCaseId) {
        window.open(
          `/${adminLocale}/admin/ai-content/edit/${data.successCaseId}?type=success_case`,
          "_blank",
          "noopener,noreferrer",
        );
      }
    } finally {
      setSuccessCaseBusy(false);
    }
  };

  const addEvent = async () => {
    if (!selectedId || !evForm.title || !evForm.startsAt || !evForm.endsAt)
      return;
    await fetch(`/api/admin/campaigns/${selectedId}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: evForm.title,
        startsAt: new Date(evForm.startsAt).toISOString(),
        endsAt: new Date(evForm.endsAt).toISOString(),
        kind: evForm.kind,
      }),
    });
    setEvForm({ title: "", startsAt: "", endsAt: "", kind: "broadcast" });
    await loadDetail(selectedId);
    await load();
  };

  const delEvent = async (eventId: string) => {
    await fetch(`/api/admin/schedule-events/${eventId}`, { method: "DELETE" });
    if (selectedId) await loadDetail(selectedId);
    await load();
  };

  const addDoc = async () => {
    if (!selectedId || !docForm.title) return;
    await fetch(`/api/admin/campaigns/${selectedId}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: docForm.kind,
        title: docForm.title,
        amountKrw: docForm.amountKrw ? Number(docForm.amountKrw) : undefined,
        status: docForm.status,
        dueDate: docForm.dueDate || undefined,
      }),
    });
    setDocForm({
      kind: "quote",
      title: "",
      amountKrw: "",
      status: "draft",
      dueDate: "",
    });
    await loadDetail(selectedId);
    await load();
  };

  const patchDoc = async (
    docId: string,
    patch: Partial<{
      status: FinancialDocStatus;
      paidAt: string | null;
    }>,
  ) => {
    await fetch(`/api/admin/financial-docs/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (selectedId) await loadDetail(selectedId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-navy">캠페인 관리</h2>
        <p className="text-sm text-muted-foreground">
          제안 → 협의 → 계약 → 제작 → 송출 → 완료 파이프라인, 송출 일정, 견적·계약·청구,
          송출 증빙 사진을 한 곳에서 관리합니다.
        </p>
      </div>

      {err ? (
        <p className="text-sm text-red-600">
          {err} (DATABASE_URL 및 prisma db push 필요)
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">새 캠페인</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            placeholder="캠페인명"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            placeholder="고객사"
            value={form.clientCompany}
            onChange={(e) =>
              setForm((f) => ({ ...f, clientCompany: e.target.value }))
            }
          />
          <Input
            placeholder="담당자"
            value={form.clientName}
            onChange={(e) =>
              setForm((f) => ({ ...f, clientName: e.target.value }))
            }
          />
          <Input
            placeholder="이메일"
            value={form.clientEmail}
            onChange={(e) =>
              setForm((f) => ({ ...f, clientEmail: e.target.value }))
            }
          />
          <Input
            placeholder="전화 (선택)"
            value={form.clientPhone}
            onChange={(e) =>
              setForm((f) => ({ ...f, clientPhone: e.target.value }))
            }
          />
          <Button
            type="button"
            className="bg-navy"
            onClick={createCampaign}
            disabled={loading}
          >
            <Plus className="mr-1 h-4 w-4" />
            등록
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">캠페인 목록</CardTitle>
            <Button variant="outline" size="sm" onClick={load} type="button">
              새로고침
            </Button>
          </CardHeader>
          <CardContent className="max-h-[420px] space-y-2 overflow-y-auto text-sm">
            {loading ? (
              <p className="text-muted-foreground">불러오는 중…</p>
            ) : list.length === 0 ? (
              <p className="text-muted-foreground">등록된 캠페인이 없습니다.</p>
            ) : (
              list.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => loadDetail(c.id)}
                  className={`w-full rounded-lg border p-3 text-left transition hover:bg-slate-50 ${
                    selectedId === c.id ? "border-gold bg-gold/5" : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-navy">{c.name}</span>
                    <Badge variant="secondary">
                      {STATUS_LABEL[c.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.clientCompany} · {c.clientName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    일정 {c._count.scheduleEvents} · 문서{" "}
                    {c._count.financialDocs} · 견적요청{" "}
                    {c._count.quoteRequests ?? 0}
                  </p>
                  <select
                    className="mt-2 w-full rounded border border-slate-200 px-2 py-1 text-xs"
                    value={c.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      patchStatus(c.id, e.target.value as CampaignStatus)
                    }
                  >
                    {(Object.keys(STATUS_LABEL) as CampaignStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarRange className="h-4 w-4" />
              송출 캘린더 · 문서
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              캠페인을 선택한 뒤 일정과 견적/계약/청구를 추가하세요.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {!selectedId ? (
              <p className="text-sm text-muted-foreground">
                왼쪽에서 캠페인을 선택하세요.
              </p>
            ) : (
              <>
                <div>
                  <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold text-navy">
                    <Link2 className="h-4 w-4" />
                    연결된 견적 요청
                  </h3>
                  <p className="mb-2 text-xs text-muted-foreground">
                    웹 견적 제출 시 이메일이 같으면 자동으로 연결됩니다. 미연결
                    건은 아래에서 수동 연결할 수 있습니다.
                  </p>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <select
                      className="min-w-[200px] flex-1 rounded border border-slate-200 px-2 py-1.5 text-xs"
                      value={attachQuoteId}
                      onChange={(e) => setAttachQuoteId(e.target.value)}
                    >
                      <option value="">미연결 견적 선택…</option>
                      {unlinkedQuotes.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.company} · {q.name} ·{" "}
                          {new Date(q.createdAt).toLocaleDateString("ko-KR")}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={attachQuote}
                      disabled={!attachQuoteId}
                    >
                      연결
                    </Button>
                  </div>
                  <ul className="max-h-28 space-y-1 overflow-y-auto text-xs">
                    {linkedQuotes.length === 0 ? (
                      <li className="text-muted-foreground">연결된 견적 없음</li>
                    ) : (
                      linkedQuotes.map((q) => (
                        <li
                          key={q.id}
                          className="flex items-center justify-between gap-2 rounded bg-slate-50 px-2 py-1"
                        >
                          <span>
                            {q.company} · {q.name}
                            {q.estimatedCost != null
                              ? ` · ${q.estimatedCost.toLocaleString()}원`
                              : ""}{" "}
                            <span className="text-muted-foreground">
                              ({q.createdAt.replace("T", " ")})
                            </span>
                          </span>
                          <button
                            type="button"
                            className="shrink-0 text-[11px] text-rose-600 underline"
                            onClick={() => unlinkQuote(q.id)}
                          >
                            해제
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>

                <div>
                  <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold text-navy">
                    <Camera className="h-4 w-4" />
                    송출 증빙 사진
                  </h3>
                  <label className="mb-2 inline-flex cursor-pointer items-center gap-2 rounded border border-dashed border-slate-300 px-3 py-2 text-xs hover:bg-slate-50">
                    이미지 업로드
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files ?? []);
                        e.target.value = "";
                        if (files.length === 0) return;
                        setProofMsg(`0 / ${files.length} 업로드 중…`);
                        for (let i = 0; i < files.length; i++) {
                          setProofMsg(`${i + 1} / ${files.length} 업로드 중…`);
                          await uploadProofImage(files[i]);
                        }
                        setProofMsg(`${files.length}장 등록 완료`);
                      }}
                    />
                  </label>
                  {proofMsg ? (
                    <p className="mb-2 text-xs text-navy">{proofMsg}</p>
                  ) : null}
                  <ul className="flex flex-wrap gap-2">
                    {proofs.length === 0 ? (
                      <li className="text-xs text-muted-foreground">
                        등록된 증빙 없음
                      </li>
                    ) : (
                      proofs.map((p) => (
                        <li
                          key={p.id}
                          className="relative w-24 shrink-0 overflow-hidden rounded border"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.imageUrl}
                            alt=""
                            className="aspect-square w-full object-cover"
                          />
                          <button
                            type="button"
                            className="absolute right-0 top-0 bg-rose-600/90 px-1 text-[10px] text-white"
                            onClick={() => delProof(p.id)}
                          >
                            삭제
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="gap-1.5"
                      disabled={successCaseBusy}
                      onClick={() => void createDraftSuccessCase()}
                    >
                      {successCaseBusy ? "…" : null}
                      성공사례 초안 (AI)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-navy/20 text-navy hover:bg-navy/5"
                      onClick={() => setShowReportPreview((v) => !v)}
                    >
                      <Eye className="h-4 w-4" />
                      {showReportPreview ? "미리보기 닫기" : "보고서 미리보기"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1.5 bg-navy text-white hover:bg-navy/90"
                      disabled={pdfBusy}
                      onClick={() => void downloadAiCompletionPdf()}
                    >
                      <FileDown className="h-4 w-4" />
                      {pdfBusy ? "생성 중…" : "완료 보고서 PDF (AI)"}
                    </Button>
                    <a
                      href={`/api/admin/campaigns/${selectedId}/completion-report`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-navy hover:bg-slate-50"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <FileText className="h-4 w-4" />
                      간단 PDF
                    </a>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    AI 보고서는 노출·성과·인사이트 섹션을 포함합니다. 간단 PDF는
                    일정·증빙·문서만 포함합니다.
                  </p>
                </div>

                {showReportPreview && selectedId && (
                  <div className="mt-4">
                    <CampaignReportPreview
                      data={{
                        campaignName: form.name,
                        clientCompany: form.clientCompany ?? "",
                        clientName: form.clientName,
                        clientEmail: form.clientEmail,
                        status: list.find(c => c.id === selectedId)?.status ?? "진행중",
                        notes: null,
                        scheduleEvents: events?.map((e: { title: string; startsAt: string; endsAt: string; kind: string }) => ({
                          title: e.title,
                          startsAt: e.startsAt,
                          endsAt: e.endsAt,
                          kind: e.kind,
                        })),
                        proofPhotos: proofs?.map((p: { imageUrl: string; caption?: string | null }) => ({
                          imageUrl: p.imageUrl,
                          caption: p.caption,
                        })),
                        mediaBookings: (list.find(c => c.id === selectedId) as { mediaBookings?: { title: string; media?: { name: string; location: string; dailyFootfall?: number | null }; startsAt: string; endsAt: string; status: string }[] })?.mediaBookings?.map((b) => ({
                          title: b.title,
                          mediaName: b.media?.name ?? "—",
                          location: b.media?.location ?? "—",
                          startsAt: b.startsAt,
                          endsAt: b.endsAt,
                          status: b.status,
                          dailyFootTraffic: b.media?.dailyFootfall ?? null,
                        })) ?? [],
                        financialDocs: docs?.map((f: { kind: string; title: string; amountKrw?: number | null; status: string }) => ({
                          kind: f.kind,
                          title: f.title,
                          amountKrw: f.amountKrw,
                          status: f.status,
                        })),
                      }}
                    />
                  </div>
                )}

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-navy">
                    송출·일정
                  </h3>
                  <div className="mb-2 grid gap-2 sm:grid-cols-2">
                    <Input
                      placeholder="제목"
                      value={evForm.title}
                      onChange={(e) =>
                        setEvForm((f) => ({ ...f, title: e.target.value }))
                      }
                    />
                    <Input
                      placeholder="유형 (broadcast 등)"
                      value={evForm.kind}
                      onChange={(e) =>
                        setEvForm((f) => ({ ...f, kind: e.target.value }))
                      }
                    />
                    <Input
                      type="datetime-local"
                      value={evForm.startsAt}
                      onChange={(e) =>
                        setEvForm((f) => ({ ...f, startsAt: e.target.value }))
                      }
                    />
                    <Input
                      type="datetime-local"
                      value={evForm.endsAt}
                      onChange={(e) =>
                        setEvForm((f) => ({ ...f, endsAt: e.target.value }))
                      }
                    />
                  </div>
                  <Button type="button" size="sm" onClick={addEvent}>
                    일정 추가
                  </Button>
                  <ul className="mt-3 space-y-2 text-xs">
                    {events.map((ev) => (
                      <li
                        key={ev.id}
                        className="flex items-start justify-between gap-2 rounded border border-slate-100 p-2"
                      >
                        <div>
                          <p className="font-medium">{ev.title}</p>
                          <p className="text-muted-foreground">
                            {ev.startsAt.replace("T", " ")} ~{" "}
                            {ev.endsAt.replace("T", " ")}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="text-rose-600"
                          onClick={() => delEvent(ev.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold text-navy">
                    <FileText className="h-4 w-4" />
                    견적 / 계약 / 청구
                  </h3>
                  <div className="mb-2 grid gap-2 sm:grid-cols-2">
                    <select
                      className="rounded border border-slate-200 px-2 py-2 text-sm"
                      value={docForm.kind}
                      onChange={(e) =>
                        setDocForm((f) => ({
                          ...f,
                          kind: e.target.value as FinancialDocKind,
                        }))
                      }
                    >
                      {DOC_KIND.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                    <Input
                      placeholder="제목"
                      value={docForm.title}
                      onChange={(e) =>
                        setDocForm((f) => ({ ...f, title: e.target.value }))
                      }
                    />
                    <Input
                      placeholder="금액(원)"
                      value={docForm.amountKrw}
                      onChange={(e) =>
                        setDocForm((f) => ({ ...f, amountKrw: e.target.value }))
                      }
                    />
                    <Input
                      type="date"
                      value={docForm.dueDate}
                      onChange={(e) =>
                        setDocForm((f) => ({ ...f, dueDate: e.target.value }))
                      }
                    />
                    <select
                      className="rounded border border-slate-200 px-2 py-2 text-sm sm:col-span-2"
                      value={docForm.status}
                      onChange={(e) =>
                        setDocForm((f) => ({
                          ...f,
                          status: e.target.value as FinancialDocStatus,
                        }))
                      }
                    >
                      {DOC_STATUS_LIST.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button type="button" size="sm" onClick={addDoc}>
                    문서 추가
                  </Button>
                  <ul className="mt-3 space-y-2 text-xs">
                    {docs.map((d) => (
                      <li
                        key={d.id}
                        className="rounded border border-slate-100 p-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium">{d.title}</span>
                          <Badge variant="outline">
                            {DOC_KIND.find((x) => x.value === d.kind)?.label}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">
                          {d.amountKrw != null
                            ? `${d.amountKrw.toLocaleString()}원`
                            : "금액 미입력"}{" "}
                          · 마감 {d.dueDate ?? "—"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <select
                            className="rounded border px-1 py-0.5"
                            value={d.status}
                            onChange={(e) =>
                              patchDoc(d.id, {
                                status: e.target.value as FinancialDocStatus,
                              })
                            }
                          >
                            {DOC_STATUS_LIST.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                              patchDoc(d.id, {
                                status: "paid",
                                paidAt: new Date().toISOString(),
                              })
                            }
                          >
                            유료 처리
                          </Button>
                        </div>
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
