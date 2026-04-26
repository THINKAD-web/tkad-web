"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useRouter } from "@/i18n/navigation";
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

  // 로그인 사용자 정보 자동 입력
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d?.ok || !d.data) return;
        const u = d.data;
        setClientName((prev) => prev || u.name || "");
        setClientEmail((prev) => prev || u.email || "");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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
        const msg = data?.error?.message ?? "견적서 생성에 실패했습니다.";
        setError(msg);
        toast.error(msg);
        return;
      }
      clear();
      toast.success("견적서가 생성되었습니다.");
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

  const inputCls =
    "h-11 w-full border-2 border-bx-black bg-bx-white px-3 font-mono text-sm text-bx-black placeholder:text-bx-gray-dim focus:border-bx-accent focus:outline-none";
  const labelCls =
    "mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <header className="mb-6 border-b-2 border-bx-black pb-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
          [ CART / QUOTE REQUEST ]
        </p>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-bx-black sm:text-3xl">
          견적서 요청
        </h1>
        <p className="mt-2 font-mono text-[12px] tracking-tight text-bx-gray-dim">
          {`// `}선택한 매체로 30분 안에 PDF 견적서를 받아보세요
        </p>
      </header>

      {ids.length === 0 ? (
        <EmptyState
          icon="🛒"
          title="장바구니가 비어있습니다"
          description="지도에서 관심 매체를 '견적서에 담기'로 추가해보세요."
          action={
            <Link
              href="/media/map"
              className="inline-flex items-center gap-2 border-2 border-bx-black bg-bx-white px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.18em] text-bx-black transition-colors hover:bg-bx-black hover:text-bx-white"
            >
              매체 탐색하러 가기
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
              [ SELECTED / {items.length} ]
            </p>
            {loading && <Spinner size="sm" label="불러오는 중…" />}
            <ul className="space-y-0">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="-mt-[2px] flex items-center gap-3 border-2 border-bx-black bg-bx-white p-3"
                >
                  {it.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={it.image}
                      alt={it.name}
                      className="h-16 w-16 flex-shrink-0 border-2 border-bx-black object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 flex-shrink-0 border-2 border-bx-black bg-bx-off" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold tracking-tight text-bx-black">{it.name}</div>
                    <div className="mt-1 truncate font-mono text-[11px] uppercase tracking-[0.18em] text-bx-gray-dim">
                      {`// `}{it.region} · {it.type}
                    </div>
                    <div className="mt-1 font-mono text-sm font-bold tabular-nums text-bx-accent">
                      {formatKRW(it.price)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(it.id, it.name)}
                    className="border-2 border-bx-black bg-bx-white px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-bx-black transition-colors hover:bg-bx-accent hover:text-bx-white hover:border-bx-accent"
                  >
                    제거
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t-2 border-bx-black pt-4">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                [ TOTAL ]
              </span>
              <span className="font-mono text-lg font-bold tabular-nums text-bx-accent">{formatKRW(total)}</span>
            </div>
          </div>

          <aside className="h-fit border-2 border-bx-accent bg-bx-white p-5 md:sticky md:top-24">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
              [ CAMPAIGN INFO ]
            </p>
            <h2 className="mt-2 mb-5 text-base font-bold tracking-tight text-bx-black">캠페인 정보</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelCls}>[ 담당자 이름 * ]</label>
                <input
                  type="text"
                  required
                  maxLength={40}
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>[ 이메일 * ]</label>
                <input
                  type="email"
                  required
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>[ 회사 (선택) ]</label>
                <input
                  type="text"
                  maxLength={80}
                  value={clientCompany}
                  onChange={(e) => setClientCompany(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>[ 연락처 (선택) ]</label>
                <input
                  type="tel"
                  maxLength={20}
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>[ 희망 기간 * ]</label>
                <input
                  type="text"
                  required
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>[ 시작일 ]</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>[ 종료일 ]</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>[ 예산 (원) ]</label>
                <input
                  type="number"
                  min="0"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  className={inputCls}
                />
              </div>

              {error && (
                <div className="border-2 border-bx-accent bg-bx-white p-3 font-mono text-[11px] tracking-tight text-bx-accent">
                  {`// `}{error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || items.length === 0}
                className="flex w-full items-center justify-center gap-2 border-2 border-bx-accent bg-bx-accent px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.18em] text-bx-white transition-colors hover:bg-bx-black hover:border-bx-black disabled:opacity-50"
              >
                {submitting && <Spinner size="sm" />}
                {submitting ? "생성 중…" : "견적서 생성"}
              </button>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
