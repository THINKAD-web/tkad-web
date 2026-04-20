"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { Spinner, EmptyState } from "@/components/ui/spinner";
import { useAppToast } from "@/lib/use-toast";

type MediaItem = {
  id: string;
  name: string;
  location: string;
  region: string;
  type: string;
  price: number;
  pricePeriod: string;
  image: string | null;
};

function formatKRW(v: number): string {
  return `₩${new Intl.NumberFormat("ko-KR").format(v)}`;
}

export default function CartPage() {
  const router = useRouter();
  const toast = useAppToast();
  const { ids, remove, clear } = useCart();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [period, setPeriod] = useState("3개월");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budgetMax, setBudgetMax] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (ids.length === 0) {
        setItems([]);
        return;
      }
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        qs.set("priceMin", "0");
        const res = await fetch(`/api/media/map?${qs.toString()}`, { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && data.ok) {
          setItems(data.data.items.filter((it: MediaItem) => ids.includes(it.id)));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [ids]);

  const total = useMemo(() => items.reduce((s, m) => s + m.price, 0), [items]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (items.length === 0) {
      setError("장바구니가 비어있습니다.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/quote/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaIds: items.map((i) => i.id),
          clientName,
          clientEmail,
          clientPhone: clientPhone || undefined,
          clientCompany: clientCompany || undefined,
          period,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          budgetMax: budgetMax ? Number(budgetMax) : undefined,
          locale: "ko",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        const msg = data?.error?.message ?? "제안서 생성에 실패했습니다.";
        setError(msg);
        toast.error(msg);
        return;
      }
      clear();
      toast.success("제안서가 생성되었습니다.");
      router.push(`/quote/${data.data.id}/preview`);
    } catch {
      const msg = "네트워크 오류가 발생했습니다.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function handleRemove(id: string, name?: string) {
    remove(id);
    toast.warning(name ? `${name}이(가) 장바구니에서 제거되었습니다.` : "장바구니에서 제거되었습니다.");
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-bold text-primary mb-1">제안서 요청</h1>
      <p className="text-sm text-muted-foreground mb-6">선택한 매체로 30분 안에 PDF 제안서를 받아보세요</p>

      {ids.length === 0 ? (
        <EmptyState
          icon="🛒"
          title="장바구니가 비어있습니다"
          description="지도에서 관심 매체를 '제안서에 담기'로 추가해보세요."
          action={
            <Link
              href="/media/map"
              className="inline-block px-4 py-2 bg-primary text-white rounded-lg text-sm"
            >
              매체 탐색하러 가기
            </Link>
          }
        />
      ) : (
        <div className="grid md:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-gray-500">
              선택한 매체 · {items.length}개
            </h2>
            {loading && <Spinner size="sm" label="불러오는 중…" />}
            <ul className="space-y-2">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center gap-3 bg-card border border-border/60 rounded-xl p-3 shadow-sm"
                >
                  {it.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={it.image}
                      alt={it.name}
                      className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded-md flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{it.name}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {it.region} · {it.type}
                    </div>
                    <div className="text-sm font-semibold text-primary mt-0.5">
                      {formatKRW(it.price)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(it.id, it.name)}
                    className="text-xs text-red-500 hover:underline px-2"
                  >
                    제거
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-sm text-gray-500">합계</span>
              <span className="text-lg font-bold text-primary">{formatKRW(total)}</span>
            </div>
          </div>

          <aside className="bg-card border border-border/60 rounded-2xl shadow-sm p-5 h-fit md:sticky md:top-24">
            <h2 className="text-base font-semibold mb-4 text-foreground">캠페인 정보</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">담당자 이름 *</label>
                <input
                  type="text"
                  required
                  maxLength={40}
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full h-10 px-3 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">이메일 *</label>
                <input
                  type="email"
                  required
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full h-10 px-3 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">회사 (선택)</label>
                <input
                  type="text"
                  maxLength={80}
                  value={clientCompany}
                  onChange={(e) => setClientCompany(e.target.value)}
                  className="w-full h-10 px-3 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">연락처 (선택)</label>
                <input
                  type="tel"
                  maxLength={20}
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full h-10 px-3 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">희망 기간 *</label>
                <input
                  type="text"
                  required
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full h-10 px-3 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">시작일</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-10 px-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">종료일</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-10 px-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">예산 (원)</label>
                <input
                  type="number"
                  min="0"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  className="w-full h-10 px-3 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || items.length === 0}
                className="w-full py-2.5 bg-primary text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <Spinner size="sm" />}
                {submitting ? "생성 중…" : "제안서 생성"}
              </button>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
