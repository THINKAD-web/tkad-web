"use client";

import { useCallback, useEffect, useRef, useMemo, useState } from "react";
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
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { captureElementAsPng } from "@/lib/html-to-pdf";
import {
  CampaignStatus,
  DOC_STATUS_LIST,
  FinancialDocKind,
  FinancialDocStatus,
  STATUS_LABEL,
  FINANCIAL_DOC_KIND_LABEL,
} from "./constants";

const CampaignReportPreview = dynamic(() => import("@/components/campaign-report-preview"), { ssr: false });

const DOC_KIND = [
  { value: "quote", label: FINANCIAL_DOC_KIND_LABEL["quote"] },
  { value: "contract", label: FINANCIAL_DOC_KIND_LABEL["contract"] },
  { value: "invoice", label: FINANCIAL_DOC_KIND_LABEL["invoice"] },
];

/**
 * Helper function for authenticated API calls with error handling
 */
async function apiCall<T>(
  url: string,
  options?: RequestInit,
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    const data = (await res.json().catch(() => ({}))) as T & { error?: string };

    if (!res.ok) {
      return { ok: false, error: data.error ?? "요청에 실패했습니다." };
    }

    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: "네트워크 오류가 발생했습니다." };
  }
}

type CampaignRow = {
  id: string;
  name: string;
  clientCompany: string;
  clientName: string;
  clientEmail: string;
  status: CampaignStatus;
  notes?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
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


export default function AdminCampaignsPage() {
  const pathname = usePathname();
  const adminLocale = pathname.split("/")[1] || "ko";

  const [list, setList] = useState<CampaignRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | "all">("all");

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
  const [mediaBookings, setMediaBookings] = useState<{
    id?: string;
    title: string;
    media?: {
      name: string;
      location: string;
      image?: string | null;
      dailyFootfall?: number | null;
      impressions?: number | null;
      visibilityScore?: number | null;
      type?: string | null;
      region?: string | null;
      operatingHours?: string | null;
      trafficPattern?: { hourly?: number[]; weekly?: number[]; monthly?: number[] } | null;
    } | null;
    startsAt: string;
    endsAt: string;
    status: string;
  }[]>([]);
  const [bookingForm, setBookingForm] = useState({ mediaSearch: "", mediaId: "", mediaName: "", startsAt: "", endsAt: "" });
  const [bookingSearchResults, setBookingSearchResults] = useState<{ id: string; name: string; location: string; dailyFootfall?: number | null }[]>([]);
  const [bookingBusy, setBookingBusy] = useState(false);
  /** loadDetail 응답 기준 — 목록(list)보다 최신 메타(비고·기간 등)로 미리보기를 맞춤 */
  const [reportCampaignMeta, setReportCampaignMeta] = useState<{
    name: string;
    clientCompany: string;
    clientName: string;
    clientEmail: string;
    status: string;
    notes: string | null;
    startDate: string | null;
    endDate: string | null;
    budgetMin: number | null;
    budgetMax: number | null;
  } | null>(null);
  // 관리자 페이지에서는 선택 캠페인 확인이 핵심이므로 기본값을 "열림"으로 둡니다.
  const [showReportPreview, setShowReportPreview] = useState(true);
  const reportCaptureRef = useRef<HTMLDivElement>(null);
  const [reportPngBusy, setReportPngBusy] = useState(false);
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
    setReportCampaignMeta(null);
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
      const campFull = c as typeof c & {
        name: string;
        clientCompany: string;
        clientName: string;
        clientEmail: string;
        status: string;
        notes?: string | null;
        startDate?: string | Date | null;
        endDate?: string | Date | null;
        budgetMin?: number | null;
        budgetMax?: number | null;
      };
      setReportCampaignMeta({
        name: campFull.name,
        clientCompany: campFull.clientCompany,
        clientName: campFull.clientName,
        clientEmail: campFull.clientEmail,
        status: campFull.status,
        notes: campFull.notes ?? null,
        startDate: campFull.startDate
          ? new Date(campFull.startDate).toISOString()
          : null,
        endDate: campFull.endDate
          ? new Date(campFull.endDate).toISOString()
          : null,
        budgetMin: campFull.budgetMin ?? null,
        budgetMax: campFull.budgetMax ?? null,
      });
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
      setMediaBookings(
        ((c as { mediaBookings?: typeof mediaBookings }).mediaBookings ?? []).map((b) => ({
          ...b,
          startsAt: new Date(b.startsAt).toISOString().slice(0, 10),
          endsAt: new Date(b.endsAt).toISOString().slice(0, 10),
        })),
      );
      setUnlinkedQuotes(uJson.quotes ?? []);
    } catch {
      setReportCampaignMeta(null);
      setEvents([]);
      setDocs([]);
      setLinkedQuotes([]);
      setProofs([]);
      setMediaBookings([]);
      setUnlinkedQuotes([]);
    }
  };

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchMediaForBooking = useCallback(async (q: string) => {
    // Cancel previous search
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!q.trim()) {
      setBookingSearchResults([]);
      return;
    }

    // Debounce search by 300ms
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/medias?q=${encodeURIComponent(q)}&limit=8`, {
          credentials: "include",
        });
        const data = (await res.json()) as {
          medias?: {
            id: string;
            name: string;
            location: string;
            dailyFootfall?: number | null;
          }[];
        };
        setBookingSearchResults(data.medias ?? []);
      } catch {
        setBookingSearchResults([]);
      }
    }, 300);
  }, []);

  // Memoized form field handlers
  const formHandlers = useMemo(
    () => ({
      name: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, name: e.target.value })),
      clientCompany: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, clientCompany: e.target.value })),
      clientName: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, clientName: e.target.value })),
      clientEmail: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, clientEmail: e.target.value })),
      clientPhone: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, clientPhone: e.target.value })),
    }),
    [],
  );

  const handleBookingSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setBookingForm((f) => ({
        ...f,
        mediaSearch: value,
        mediaId: "",
        mediaName: "",
      }));
      void searchMediaForBooking(value);
    },
    [searchMediaForBooking],
  );

  // Filter and search the campaign list
  const filteredList = useMemo(() => {
    let result = list;

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.clientCompany.toLowerCase().includes(q) ||
          c.clientName.toLowerCase().includes(q) ||
          c.clientEmail.toLowerCase().includes(q),
      );
    }

    return result;
  }, [list, statusFilter, searchQuery]);

  const addMediaBooking = async ({ force = false } = {}) => {
    if (!selectedId || !bookingForm.mediaId || !bookingForm.startsAt || !bookingForm.endsAt) return;
    setBookingBusy(true);
    try {
      const res = await fetch(`/api/admin/campaigns/${selectedId}/bookings`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaId: bookingForm.mediaId,
          startsAt: bookingForm.startsAt,
          endsAt: bookingForm.endsAt,
          force,
        }),
      });
      if (res.status === 409) {
        const j = (await res.json()) as {
          conflicts?: { summary: string }[];
          error?: string;
        };
        const summary = (j.conflicts ?? []).map((c) => `· ${c.summary}`).join("\n");
        const ok = window.confirm(
          `이 매체에 활성 예약이 겹칩니다.\n\n${summary}\n\n그래도 강제 연결할까요?`,
        );
        if (ok) {
          await addMediaBooking({ force: true });
        }
        return;
      }
      if (!res.ok) { const j = await res.json(); window.alert(j.error ?? "실패"); return; }
      setBookingForm({ mediaSearch: "", mediaId: "", mediaName: "", startsAt: "", endsAt: "" });
      setBookingSearchResults([]);
      await loadDetail(selectedId);
    } finally { setBookingBusy(false); }
  };

  const removeMediaBooking = async (bookingId: string) => {
    if (!selectedId || !window.confirm("매체 연결을 삭제할까요?")) return;
    await fetch(`/api/admin/campaigns/${selectedId}/bookings?bookingId=${bookingId}`, { method: "DELETE", credentials: "include" });
    await loadDetail(selectedId);
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
    // Validation
    if (!form.name.trim()) {
      setFormErr("캠페인명은 필수입니다.");
      return;
    }
    if (!form.clientCompany.trim()) {
      setFormErr("고객사는 필수입니다.");
      return;
    }
    if (!form.clientName.trim()) {
      setFormErr("담당자는 필수입니다.");
      return;
    }
    if (!form.clientEmail.trim()) {
      setFormErr("이메일은 필수입니다.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.clientEmail)) {
      setFormErr("유효한 이메일 주소를 입력하세요.");
      return;
    }

    setFormErr(null);
    setCreateBusy(true);
    try {
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
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setFormErr(data.error ?? "캠페인 생성에 실패했습니다.");
        return;
      }
      setForm({
        name: "",
        clientCompany: "",
        clientName: "",
        clientEmail: "",
        clientPhone: "",
      });
      await load();
    } catch {
      setFormErr("네트워크 오류가 발생했습니다. 다시 시도하세요.");
    } finally {
      setCreateBusy(false);
    }
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

  const deleteCampaign = async (id: string, name: string) => {
    if (
      !window.confirm(
        `"${name}" 캠페인을 삭제하시겠습니까?\n연결된 일정·매체·증빙·문서도 함께 사라질 수 있습니다. 되돌릴 수 없습니다.`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        window.alert(data.error ?? "삭제에 실패했습니다.");
        return;
      }
      if (selectedId === id) {
        setSelectedId(null);
        setEvents([]);
        setDocs([]);
        setLinkedQuotes([]);
        setProofs([]);
        setMediaBookings([]);
      }
      await load();
    } catch (e) {
      console.error("[admin/campaigns] delete failed", e);
      window.alert("네트워크 오류가 발생했습니다.");
    }
  };

  // (규칙) AI 기반 보고서 생성은 비활성화되었습니다.

  // (규칙) AI 기반 성공사례 초안 생성은 비활성화되었습니다.

  const reportPreviewData = useMemo(() => {
    if (!selectedId) return null;
    const row = list.find((c) => c.id === selectedId);
    const m = reportCampaignMeta;
    const st = (m?.status ?? row?.status) as CampaignStatus;
    return {
      campaignName: m?.name ?? row?.name ?? "—",
      clientCompany: m?.clientCompany ?? row?.clientCompany ?? "",
      clientName: m?.clientName ?? row?.clientName ?? "",
      clientEmail: m?.clientEmail ?? row?.clientEmail ?? "",
      status: STATUS_LABEL[st] ?? m?.status ?? row?.status ?? "—",
      notes: m?.notes ?? row?.notes ?? null,
      startDate: m?.startDate ?? row?.startDate ?? null,
      endDate: m?.endDate ?? row?.endDate ?? null,
      budgetMin: m?.budgetMin ?? row?.budgetMin ?? null,
      budgetMax: m?.budgetMax ?? row?.budgetMax ?? null,
      scheduleEvents: events.map((e) => ({
        title: e.title,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        kind: e.kind,
      })),
      proofPhotos: proofs.map((p) => ({
        imageUrl: p.imageUrl,
        caption: p.caption,
      })),
      mediaBookings: mediaBookings.map((b) => ({
        title: b.title,
        mediaName: b.media?.name ?? "—",
        location: b.media?.location ?? "—",
        startsAt: b.startsAt,
        endsAt: b.endsAt,
        status: b.status,
        imageUrl: b.media?.image ?? undefined,
        dailyFootTraffic: b.media?.dailyFootfall ?? null,
        type: b.media?.type ?? null,
        region: b.media?.region ?? null,
        visibilityScore: b.media?.visibilityScore ?? null,
        operatingHours: b.media?.operatingHours ?? null,
        impressions: b.media?.impressions ?? null,
        trafficPattern: b.media?.trafficPattern ?? null,
      })),
      financialDocs: docs.map((f) => ({
        kind: f.kind,
        title: f.title,
        amountKrw: f.amountKrw,
        status: f.status,
      })),
    };
  }, [
    selectedId,
    list,
    reportCampaignMeta,
    events,
    proofs,
    docs,
    mediaBookings,
  ]);

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
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
          [ CAMPAIGNS ]
        </p>
        <h2 className="mt-2 text-lg font-bold tracking-tight text-bx-black dark:text-bx-white">
          캠페인 관리
        </h2>
        <p className="mt-1 font-mono text-[11px] tracking-tight text-bx-gray-dim">
          제안 → 협의 → 계약 → 제작 → 송출 → 완료 파이프라인, 송출 일정, 견적·계약·청구,
          송출 증빙 사진을 한 곳에서 관리합니다.
        </p>
      </div>

      {err ? (
        <p className="text-sm text-red-600">
          {err} (DATABASE_URL 및 prisma db push 필요)
        </p>
      ) : null}

      {/* 상단: 새 캠페인 + 캠페인 목록 (가로 배치) */}
      <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">새 캠페인</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {formErr && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {formErr}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                placeholder="캠페인명"
                value={form.name}
                onChange={formHandlers.name}
                aria-label="캠페인명"
                disabled={createBusy}
              />
              <Input
                placeholder="고객사"
                value={form.clientCompany}
                onChange={formHandlers.clientCompany}
                aria-label="고객사"
                disabled={createBusy}
              />
              <Input
                placeholder="담당자"
                value={form.clientName}
                onChange={formHandlers.clientName}
                aria-label="담당자"
                disabled={createBusy}
              />
              <Input
                placeholder="이메일"
                value={form.clientEmail}
                onChange={formHandlers.clientEmail}
                aria-label="이메일"
                type="email"
                disabled={createBusy}
              />
              <Input
                placeholder="전화 (선택)"
                value={form.clientPhone}
                onChange={formHandlers.clientPhone}
                aria-label="전화 번호"
                disabled={createBusy}
              />
              <Button
                type="button"
                className="border-2 border-bx-black bg-bx-black text-bx-white transition-colors hover:bg-bx-accent hover:border-bx-accent dark:border-bx-white dark:bg-bx-white dark:text-bx-black dark:hover:bg-bx-accent dark:hover:border-bx-accent dark:hover:text-bx-white"
                onClick={createCampaign}
                disabled={loading || createBusy}
                aria-label="새 캠페인 등록"
              >
                {createBusy ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-1 h-4 w-4" />
                )}
                {createBusy ? "등록 중…" : "등록"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
              <div className="mb-3 flex items-center justify-between">
                <CardTitle className="text-base">캠페인 목록</CardTitle>
                <Button variant="outline" size="sm" onClick={load} type="button">
                  새로고침
                </Button>
              </div>
              <div className="space-y-2">
                <Input
                  placeholder="캠페인명, 고객사, 담당자, 이메일로 검색…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs"
                  aria-label="캠페인 검색"
                />
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as CampaignStatus | "all")
                  }
                  className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs"
                  aria-label="상태별 필터"
                >
                  <option value="all">모든 상태</option>
                  {(Object.keys(STATUS_LABEL) as CampaignStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent className="max-h-[240px] space-y-2 overflow-y-auto text-sm">
              {loading ? (
                <p className="text-muted-foreground">불러오는 중…</p>
              ) : filteredList.length === 0 ? (
                <p className="text-muted-foreground">
                  {list.length === 0
                    ? "등록된 캠페인이 없습니다."
                    : "검색 결과가 없습니다."}
                </p>
              ) : (
                filteredList.map((c) => (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => loadDetail(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        loadDetail(c.id);
                      }
                    }}
                    className={`w-full rounded-lg border p-2 text-left transition hover:bg-slate-50 ${
                      selectedId === c.id ? "border-bx-accent bg-bx-off" : "border-slate-200"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="line-clamp-1 font-semibold text-bx-black dark:text-bx-white">{c.name}</span>
                      <Badge variant="secondary">
                        {STATUS_LABEL[c.status]}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {c.clientCompany} · {c.clientName}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      일정 {c._count.scheduleEvents} · 문서{" "}
                      {c._count.financialDocs} · 견적요청{" "}
                      {c._count.quoteRequests ?? 0}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <select
                        className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs"
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
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void deleteCampaign(c.id, c.name);
                        }}
                        title="캠페인 삭제"
                        aria-label="캠페인 삭제"
                        className="inline-flex h-7 w-7 items-center justify-center rounded border border-red-200 bg-white text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
      </div>

      <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4" />
              완료 보고서 미리보기
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              미리보기·이미지 저장은 아래에서 동작합니다. 공식 PDF는「완료 보고서 PDF」로 받습니다.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 border-2 border-bx-black bg-bx-white p-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                [ REPORT ACTIONS ]
              </p>
              <div className="flex flex-wrap gap-0">
                <button
                  type="button"
                  onClick={() => setShowReportPreview((v) => !v)}
                  className="inline-flex items-center justify-center gap-1.5 border-2 border-bx-black bg-bx-white px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-bx-black transition-colors hover:bg-bx-black hover:text-bx-white"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {showReportPreview ? "미리보기 닫기" : "보고서 미리보기"}
                </button>
                <button
                  type="button"
                  className="-ml-[2px] inline-flex items-center justify-center gap-1.5 border-2 border-bx-black bg-bx-white px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-bx-black transition-colors hover:bg-bx-black hover:text-bx-white disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={
                    !selectedId ||
                    !showReportPreview ||
                    !reportPreviewData ||
                    reportPngBusy
                  }
                  onClick={async () => {
                    const el = reportCaptureRef.current;
                    if (!el) return;
                    setReportPngBusy(true);
                    try {
                      const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
                      await captureElementAsPng(el, `싱커드_게재보고서_${d}.png`);
                    } catch (e) {
                      console.error("[campaigns] report png", e);
                      window.alert(
                        `이미지 저장에 실패했습니다.\n${e instanceof Error ? e.message : String(e)}`,
                      );
                    } finally {
                      setReportPngBusy(false);
                    }
                  }}
                >
                  {reportPngBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                  이미지 저장
                </button>
                <a
                  href={
                    selectedId
                      ? `/api/admin/campaigns/${selectedId}/completion-report`
                      : "#"
                  }
                  className="-ml-[2px] inline-flex items-center justify-center gap-1.5 border-2 border-bx-accent bg-bx-accent px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-bx-black hover:border-bx-black disabled:opacity-40 disabled:cursor-not-allowed"
                  target="_blank"
                  rel="noreferrer"
                  aria-disabled={!selectedId}
                  onClick={(e) => {
                    if (!selectedId) e.preventDefault();
                  }}
                >
                  <FileDown className="h-3.5 w-3.5" />
                  완료 보고서 PDF
                </a>
              </div>
              <p className="font-mono text-[10px] tracking-tight text-bx-gray-dim">
                {`// `}서버 PDF(완료 보고서)는 KPI·패턴·매체·일정·문서를 반영합니다. 이미지 저장은 화면 캡처용입니다.
              </p>
            </div>

            {!selectedId ? (
              <p className="text-sm text-muted-foreground">
                왼쪽에서 캠페인을 선택하세요.
              </p>
            ) : showReportPreview && reportPreviewData ? (
              <CampaignReportPreview ref={reportCaptureRef} data={reportPreviewData} />
            ) : (
              <p className="text-sm text-muted-foreground">
                미리보기가 닫혀 있습니다.
              </p>
            )}
          </CardContent>
        </Card>

      {/* 하단: 송출 캘린더 · 문서 */}
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
              위에서 캠페인을 선택하세요.
            </p>
          ) : (
            <>
              <div>
                <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold text-bx-black dark:text-bx-white">
                  <Link2 className="h-4 w-4" />
                  연결된 견적 요청
                </h3>
                <p className="mb-2 text-xs text-muted-foreground">
                  웹 견적 제출 시 이메일이 같으면 자동으로 연결됩니다. 미연결 건은 아래에서 수동 연결할 수 있습니다.
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
                <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold text-bx-black dark:text-bx-white">
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
                  <p className="mb-2 text-xs text-bx-black dark:text-bx-white">{proofMsg}</p>
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

              {/* 집행 매체 연결 */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-bx-black dark:text-bx-white">집행 매체 연결</h3>
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      placeholder="매체명 검색 (예: 뱅뱅빌딩)"
                      value={bookingForm.mediaSearch}
                      onChange={handleBookingSearchChange}
                      className="text-xs"
                    />
                    {bookingSearchResults.length > 0 && !bookingForm.mediaId && (
                      <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-navy/15 bg-white shadow-lg">
                        {bookingSearchResults.map(m => (
                          <button key={m.id} type="button"
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs hover:bg-slate-50"
                            onClick={() => {
                              setBookingForm(f => ({ ...f, mediaId: m.id, mediaName: m.name, mediaSearch: m.name }));
                              setBookingSearchResults([]);
                            }}
                          >
                            <div>
                              <p className="font-semibold text-bx-black dark:text-bx-white">{m.name}</p>
                              <p className="text-muted-foreground">{m.location}</p>
                            </div>
                            {m.dailyFootfall && <span className="ml-auto text-muted-foreground">{m.dailyFootfall.toLocaleString()}명/일</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {bookingForm.mediaId && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-[10px] text-muted-foreground">시작일</label>
                        <Input type="date" value={bookingForm.startsAt} onChange={e => setBookingForm(f => ({ ...f, startsAt: e.target.value }))} className="text-xs" />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] text-muted-foreground">종료일</label>
                        <Input type="date" value={bookingForm.endsAt} onChange={e => setBookingForm(f => ({ ...f, endsAt: e.target.value }))} className="text-xs" />
                      </div>
                    </div>
                  )}
                  {bookingForm.mediaId && (
                    <Button type="button" size="sm" disabled={bookingBusy || !bookingForm.startsAt || !bookingForm.endsAt} onClick={() => void addMediaBooking()} className="gap-1.5 border-2 border-bx-black bg-bx-black text-bx-white transition-colors hover:bg-bx-accent hover:border-bx-accent dark:border-bx-white dark:bg-bx-white dark:text-bx-black dark:hover:bg-bx-accent dark:hover:border-bx-accent dark:hover:text-bx-white">
                      {bookingBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      매체 연결 추가
                    </Button>
                  )}
                  {mediaBookings.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {mediaBookings.map((b, i) => (
                        <div key={b.id ?? i} className="flex items-center gap-2 rounded-lg border border-navy/10 bg-slate-50/60 px-3 py-2 text-xs">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-bx-black dark:text-bx-white">{b.media?.name ?? b.title}</p>
                            <p className="text-muted-foreground">{b.startsAt?.slice(0,10)} ~ {b.endsAt?.slice(0,10)} {b.media?.dailyFootfall ? `· ${b.media.dailyFootfall.toLocaleString()}명/일` : ""}</p>
                          </div>
                          {b.id && (
                            <button type="button" onClick={() => void removeMediaBooking(b.id!)} className="text-red-400 hover:text-red-600">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-bx-black dark:text-bx-white">
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
                <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold text-bx-black dark:text-bx-white">
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
  );
}
