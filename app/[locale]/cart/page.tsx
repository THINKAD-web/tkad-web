"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useCart } from "@/lib/cart";
import { Spinner } from "@/components/ui/spinner";
import { useAppToast } from "@/lib/use-toast";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";

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
    "tkad-auth-input h-11 w-full rounded-[18px] border border-white/12 bg-black/28 px-4 font-mono text-sm font-semibold text-white placeholder:text-white/45 outline-none backdrop-blur transition-all focus:border-white/18 focus:ring-2 focus:ring-white/12";
  const labelCls =
    "mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/65";

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon tkad-media-page min-h-[calc(100vh-72px)]">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
          <header className="mb-8">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/65">
              [ CART / QUOTE REQUEST ]
            </p>
            <h1 className="mt-2 text-balance text-3xl font-black tracking-[-0.05em] text-white sm:text-4xl">
              견적서 요청
            </h1>
            <p className="mt-3 font-mono text-[12px] tracking-tight text-white/55">
              {`// `}선택한 매체로 30분 안에 PDF 견적서를 받아보세요
            </p>
          </header>

          {ids.length === 0 ? (
            <div className="tkad-glass-surface mx-auto max-w-2xl p-8 sm:p-10">
              <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08] tkad-neon-grid" />
              <h2 className="text-center text-xl font-black tracking-tight text-white">
                장바구니가 비어있습니다
              </h2>
              <p className="mt-3 text-center font-mono text-[12px] tracking-tight text-white/55">
                {`// `}지도에서 관심 매체를 “견적서에 담기”로 추가해보세요.
              </p>
              <div className="mt-8 flex justify-center">
                <Link
                  href="/media/map"
                  className="inline-flex h-14 items-center justify-center rounded-[22px] border border-white/14 bg-white/8 px-8 font-mono text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur transition-transform hover:-translate-y-0.5 hover:bg-white/10"
                >
                  매체 탐색하러 가기
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
              <section className="tkad-glass-surface p-6 sm:p-7">
                <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06] tkad-neon-grid" />
                <div className="relative">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/65">
                        [ SELECTED / {items.length} ]
                      </p>
                      <p className="mt-2 text-sm font-semibold text-white/80">
                        {loading ? "불러오는 중…" : "선택된 매체 목록"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        clear();
                        toast.warning("장바구니를 비웠습니다.");
                      }}
                      className="inline-flex h-10 items-center justify-center rounded-[18px] border border-white/12 bg-white/6 px-4 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      전체 비우기
                    </button>
                  </div>

                  {loading ? (
                    <div className="mt-4 flex items-center gap-2 text-white/70">
                      <Spinner size="sm" label="불러오는 중…" />
                      <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
                        Loading
                      </span>
                    </div>
                  ) : null}

                  <ul className="mt-5 space-y-3">
                    {items.map((it) => (
                      <li
                        key={it.id}
                        className="flex items-center gap-4 rounded-[22px] border border-white/12 bg-black/20 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur"
                      >
                        {it.image ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={it.image}
                            alt={it.name}
                            className="h-16 w-16 flex-shrink-0 rounded-[16px] border border-white/10 object-cover"
                          />
                        ) : (
                          <div className="h-16 w-16 flex-shrink-0 rounded-[16px] border border-white/10 bg-black/25" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-black tracking-tight text-white">
                            {it.name}
                          </div>
                          <div className="mt-1 truncate font-mono text-[11px] uppercase tracking-[0.18em] text-white/55">
                            {`// `}{it.region} · {it.type}
                          </div>
                          <div className="mt-1 font-mono text-sm font-black tabular-nums text-white">
                            {formatKRW(it.price)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemove(it.id, it.name)}
                          className="inline-flex h-10 items-center justify-center rounded-[18px] border border-white/12 bg-white/6 px-4 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          제거
                        </button>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/65">
                      [ TOTAL ]
                    </span>
                    <span className="font-mono text-2xl font-black tabular-nums text-white">
                      {formatKRW(total)}
                    </span>
                  </div>
                </div>
              </section>

              <aside className="tkad-glass-surface h-fit p-6 sm:p-7 lg:sticky lg:top-24">
                <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06] tkad-neon-grid" />
                <div className="relative">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/65">
                    [ CAMPAIGN INFO ]
                  </p>
                  <h2 className="mt-2 text-lg font-black tracking-tight text-white">캠페인 정보</h2>
                  <p className="mt-2 font-mono text-[12px] tracking-tight text-white/55">
                    {`// `}기본 정보만 입력하면 PDF 견적서가 생성됩니다.
                  </p>

                  <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
                      <div className="rounded-[18px] border border-white/14 bg-black/35 p-3 font-mono text-[11px] tracking-tight text-white/85">
                        {`// `}{error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting || items.length === 0}
                      className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-[22px] border border-white/14 bg-[linear-gradient(135deg,rgba(168,85,247,0.95),rgba(34,211,238,0.95),rgba(236,72,153,0.95))] px-6 font-mono text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_60px_rgba(0,0,0,0.55)] transition-transform hover:-translate-y-0.5 hover:opacity-95 disabled:opacity-50"
                    >
                      {submitting && <Spinner size="sm" />}
                      {submitting ? "생성 중…" : "견적서 생성"}
                    </button>
                    <p className="text-center font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
                      {`// `}{submitting ? "processing" : "secure request"}
                    </p>
                  </form>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </HomeLandingDayNight>
  );
}
