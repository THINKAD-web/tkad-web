"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useCart } from "@/lib/cart";
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const mediaIds =
      items.length > 0 ? items.map((i) => i.id) : ids.filter(Boolean);
    if (mediaIds.length === 0) {
      setError("장바구니가 비어있습니다.");
      return;
    }
    router.push(`/quote?media=${mediaIds.join(",")}`);
  }

  function handleRemove(id: string, name?: string) {
    remove(id);
    toast.warning(name ? `${name}이(가) 장바구니에서 제거되었습니다.` : "장바구니에서 제거되었습니다.");
  }

  const inputCls =
    "tkad-auth-input h-11 w-full rounded-[18px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white/28 px-4 text-sm font-semibold dark:text-white text-gray-900 placeholder:dark:text-white outline-none backdrop-blur transition-all focus:dark:border-white/18 border-gray-300 focus:ring-2 focus:ring-white/12";
  const labelCls =
    "mb-2 block font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-600";

  const kickerCls =
    "whitespace-nowrap font-display text-xs font-medium uppercase leading-none tracking-[0.22em] dark:text-white text-gray-600";
  const cartTitleCls = "text-lg font-black tracking-tight dark:text-white text-gray-900";
  const cartLeadCls = "text-[12px] leading-snug tracking-tight dark:text-white text-gray-500";
  const clearCartBtnCls =
    "inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-[18px] border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 px-4 font-display text-xs font-medium uppercase tracking-[0.18em] dark:text-white text-gray-700 transition-colors hover:dark:bg-white/10 bg-gray-100 hover:dark:text-white text-gray-900";

  /** `lg` 에서 목록 열 / 폼 열 너비를 헤더·본문 두 밴드가 동일하게 쓰도록 공유 */
  const cartLgCols = "lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-x-8";

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon tkad-media-page flex min-h-0 w-full flex-1 flex-col">
        <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-1 flex-col px-4 pt-8 pb-36 sm:px-5 sm:pt-10 sm:pb-40 lg:pt-12 lg:pb-48">
          <header className="mb-6 min-w-0 sm:mb-8">
            <p className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-600">
              [ CART / QUOTE REQUEST ]
            </p>
            <h1 className="mt-2 text-balance text-3xl font-black tracking-[-0.05em] dark:text-white text-gray-900 sm:text-4xl">
              견적서 요청
            </h1>
            <p className="mt-3 text-[12px] tracking-tight dark:text-white text-gray-500">
              {`// `}선택한 매체로 30분 안에 PDF 견적서를 받아보세요
            </p>
          </header>

          {ids.length === 0 ? (
            <div className="tkad-glass-surface mx-auto w-full max-w-2xl p-8 sm:p-10">
              <h2 className="text-center text-xl font-black tracking-tight dark:text-white text-gray-900">
                장바구니가 비어있습니다
              </h2>
              <p className="mt-3 text-center text-[12px] tracking-tight dark:text-white text-gray-500">
                {`// `}지도에서 관심 매체를 “견적서에 담기”로 추가해보세요.
              </p>
              <div className="mt-8 flex justify-center">
                <Link
                  href="/media"
                  className="inline-flex h-14 items-center justify-center rounded-[22px] border dark:border-white/14 border-gray-200 dark:bg-white/8 bg-gray-100 px-8 font-display text-xs font-medium uppercase tracking-[0.18em] dark:text-white text-gray-900 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur transition-transform hover:-translate-y-0.5 hover:dark:bg-white/10"
                >
                  매체 탐색하러 가기
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-y-5">
              {/* 모바일: 열 스택 / lg+: 같은 그리드에서 행마다 좌·우를 짝지어 상단 라인이 어긋나지 않게 함 */}
              <div className="flex min-w-0 flex-col gap-y-5 lg:hidden">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-col gap-2">
                    <p className={kickerCls}>[ SELECTED / {items.length} ]</p>
                    <h2 className={cartTitleCls}>
                      {loading ? "불러오는 중…" : "선택된 매체 목록"}
                    </h2>
                    <p className={cartLeadCls}>
                      {loading
                        ? `${`// `}매체 정보를 불러오는 중입니다.`
                        : `${`// `}담긴 매체를 확인한 뒤 견적서를 요청하세요.`}
                    </p>
                  </div>
                  <div className="mt-3 flex justify-end sm:mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        clear();
                        toast.warning("장바구니를 비웠습니다.");
                      }}
                      className={clearCartBtnCls}
                    >
                      전체 비우기
                    </button>
                  </div>
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                  <p className={kickerCls}>[ CAMPAIGN INFO ]</p>
                  <h2 className={cartTitleCls}>캠페인 정보</h2>
                  <p className={cartLeadCls}>
                    {`// `}기본 정보만 입력하면 PDF 견적서가 생성됩니다.
                  </p>
                </div>
              </div>

              <div
                className={`hidden min-w-0 lg:grid ${cartLgCols} items-start gap-y-2`}
              >
                <p className={`${kickerCls} min-w-0`}>[ SELECTED / {items.length} ]</p>
                <p className={`${kickerCls} min-w-0`}>[ CAMPAIGN INFO ]</p>
                <h2 className={`${cartTitleCls} min-w-0`}>
                  {loading ? "불러오는 중…" : "선택된 매체 목록"}
                </h2>
                <h2 className={`${cartTitleCls} min-w-0`}>캠페인 정보</h2>
                <p className={`${cartLeadCls} min-w-0`}>
                  {loading
                    ? `${`// `}매체 정보를 불러오는 중입니다.`
                    : `${`// `}담긴 매체를 확인한 뒤 견적서를 요청하세요.`}
                </p>
                <p className={`${cartLeadCls} min-w-0`}>
                  {`// `}기본 정보만 입력하면 PDF 견적서가 생성됩니다.
                </p>
                <div className="flex min-w-0 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      clear();
                      toast.warning("장바구니를 비웠습니다.");
                    }}
                    className={clearCartBtnCls}
                  >
                    전체 비우기
                  </button>
                </div>
                <div className="min-h-10 min-w-0" aria-hidden />
              </div>

              <div
                className={`grid min-w-0 grid-cols-1 content-start gap-y-5 ${cartLgCols} lg:gap-y-0 lg:items-stretch`}
              >
                <section
                  aria-busy={loading}
                  className="tkad-glass-surface flex min-h-0 min-w-0 flex-col p-5 sm:p-6 lg:h-full lg:min-h-0 lg:p-7"
                >
                <div className="relative flex min-h-0 flex-1 flex-col">
                  <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-contain">
                    {items.map((it) => (
                      <li
                        key={it.id}
                        className="flex flex-col gap-3 rounded-[22px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white/20 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur sm:flex-row sm:items-center sm:gap-3 sm:p-4"
                      >
                        {it.image ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={it.image}
                            alt={it.name}
                            className="h-14 w-14 shrink-0 rounded-[14px] border dark:border-white/10 border-gray-200 object-cover sm:h-16 sm:w-16 sm:rounded-[16px]"
                          />
                        ) : (
                          <div className="h-14 w-14 shrink-0 rounded-[14px] border dark:border-white/10 border-gray-200 dark:bg-black bg-white/25 sm:h-16 sm:w-16 sm:rounded-[16px]" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="break-words text-sm font-black leading-snug tracking-tight dark:text-white text-gray-900">
                            {it.name}
                          </div>
                          <div className="mt-1 break-words font-display text-xs font-medium uppercase leading-snug tracking-[0.18em] dark:text-white text-gray-500">
                            {`// `}
                            {it.region} · {it.type}
                          </div>
                          <div className="mt-1 text-sm font-black tabular-nums dark:text-white text-gray-900">
                            {formatKRW(it.price)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemove(it.id, it.name)}
                          className="inline-flex h-10 w-full shrink-0 items-center justify-center rounded-[18px] border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 px-4 font-display text-xs font-medium uppercase tracking-[0.18em] dark:text-white text-gray-700 transition-colors hover:dark:bg-white/10 bg-gray-100 hover:dark:text-white text-gray-900 sm:ml-auto sm:w-auto sm:self-center"
                        >
                          제거
                        </button>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 flex shrink-0 items-center justify-between border-t dark:border-white/10 border-gray-200 pt-5">
                    <span className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-600">
                      [ TOTAL ]
                    </span>
                    <span className="text-2xl font-black tabular-nums dark:text-white text-gray-900">
                      {formatKRW(total)}
                    </span>
                  </div>
                </div>
                </section>

                <aside className="tkad-glass-surface flex min-h-0 min-w-0 flex-col p-5 sm:p-6 lg:h-full lg:min-h-0 lg:p-7">
                <div className="relative flex min-h-0 flex-1 flex-col">
                  <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-y-contain">
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
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-2">
                      <div className="min-w-0">
                        <label className={labelCls}>[ 시작일 ]</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <div className="min-w-0">
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
                    </div>

                    <div className="mt-auto flex flex-col gap-3 border-t dark:border-white/10 border-gray-200 pt-4">
                    {error && (
                      <div className="rounded-[18px] border dark:border-white/14 border-gray-200 dark:bg-black bg-white/35 p-3 text-[11px] tracking-tight dark:text-white text-gray-800">
                        {`// `}{error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={items.length === 0 && ids.length === 0}
                      className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-[22px] border dark:border-white/14 border-gray-200 bg-hermes px-6 font-display text-xs font-medium uppercase tracking-[0.18em] text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-cta-hover disabled:opacity-50"
                    >
                      견적 요청하기
                    </button>
                    <p className="text-center font-display text-xs font-medium uppercase tracking-[0.18em] dark:text-white">
                      {`// `}quote wizard · media pre-selected
                    </p>
                    </div>
                  </form>
                </div>
              </aside>
              </div>
            </div>
          )}
        </div>
      </div>
    </HomeLandingDayNight>
  );
}
