"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FullPageSpinner, Spinner, EmptyState } from "@/components/ui/spinner";

type Me = { id: string; email: string; name: string; role: string } | null;

type Favorite = {
  id: string;
  name: string;
  location: string;
  region: string;
  type: string;
  price: number;
  pricePeriod: string;
  image: string | null;
  visibilityScore: number;
  favoritedAt: string;
};

type Quote = {
  id: string;
  status: string;
  clientName: string;
  clientCompany: string | null;
  period: string;
  startDate: string | null;
  endDate: string | null;
  totalAmount: number;
  mediaCount: number;
  createdAt: string;
  isInProgress: boolean;
};

function formatKRW(v: number): string {
  return `₩${new Intl.NumberFormat("ko-KR").format(v)}`;
}
function formatDate(s: string | null): string {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("ko-KR");
}

const STATUS_LABEL: Record<string, string> = {
  draft: "초안",
  booking_requested: "예약 요청",
  booking_confirmed: "예약 확정",
  invoice_sent: "청구서 발송",
  payment_confirmed: "결제 완료",
  contract_confirmed: "계약 확정",
  cancelled: "취소",
};

type Tab = "favorites" | "quotes" | "campaigns";

export default function MyDashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me>(null);
  const [meLoading, setMeLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("favorites");

  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [favLoading, setFavLoading] = useState(false);

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [inProgress, setInProgress] = useState<Quote[]>([]);
  const [qLoading, setQLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadSession() {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!data.ok || !data.data) {
          router.replace("/login?redirect=/my");
          return;
        }
        setMe(data.data);
      } finally {
        if (!cancelled) setMeLoading(false);
      }
    }
    loadSession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    async function loadFavorites() {
      setFavLoading(true);
      try {
        const res = await fetch("/api/my/favorites", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && data.ok) setFavorites(data.data.items);
      } finally {
        if (!cancelled) setFavLoading(false);
      }
    }
    async function loadQuotes() {
      setQLoading(true);
      try {
        const res = await fetch("/api/my/quotes", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && data.ok) {
          setQuotes(data.data.items);
          setInProgress(data.data.inProgress);
        }
      } finally {
        if (!cancelled) setQLoading(false);
      }
    }
    loadFavorites();
    loadQuotes();
    return () => {
      cancelled = true;
    };
  }, [me]);

  async function removeFavorite(mediaId: string) {
    const res = await fetch("/api/my/favorite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaId, action: "remove" }),
    });
    if (res.ok) {
      setFavorites((prev) => prev.filter((f) => f.id !== mediaId));
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (meLoading || !me) {
    return <FullPageSpinner label="대시보드 불러오는 중…" />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">안녕하세요, {me.name}님</h1>
          <p className="text-sm text-gray-500 mt-1">{me.email}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          로그아웃
        </button>
      </header>

      <section className="grid grid-cols-3 gap-2 sm:gap-3 mb-8">
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-gray-500">관심 매체</div>
          <div className="text-2xl font-bold mt-1">{favorites.length}</div>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-gray-500">진행 캠페인</div>
          <div className="text-2xl font-bold mt-1">{inProgress.length}</div>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-gray-500">전체 제안서</div>
          <div className="text-2xl font-bold mt-1">{quotes.length}</div>
        </div>
      </section>

      <nav className="flex border-b mb-6">
        <button
          type="button"
          onClick={() => setTab("favorites")}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === "favorites" ? "border-primary text-primary" : "border-transparent text-gray-500"}`}
        >
          관심 매체
        </button>
        <button
          type="button"
          onClick={() => setTab("quotes")}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === "quotes" ? "border-primary text-primary" : "border-transparent text-gray-500"}`}
        >
          지난 제안서
        </button>
        <button
          type="button"
          onClick={() => setTab("campaigns")}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === "campaigns" ? "border-primary text-primary" : "border-transparent text-gray-500"}`}
        >
          진행 캠페인
        </button>
      </nav>

      {tab === "favorites" && (
        <div>
          {favLoading ? (
            <div className="py-12 text-center">
              <Spinner size="md" label="관심 매체 불러오는 중…" />
            </div>
          ) : favorites.length === 0 ? (
            <EmptyState
              icon="⭐"
              title="관심 매체가 없습니다"
              description="지도에서 매체 카드의 하트 아이콘을 눌러 관심 매체로 저장해보세요."
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
            <ul className="grid md:grid-cols-2 gap-3">
              {favorites.map((m) => (
                <li key={m.id} className="bg-white border rounded-lg p-3 flex gap-3">
                  {m.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={m.image}
                      alt={m.name}
                      className="w-20 h-20 object-cover rounded-md flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-100 rounded-md flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{m.name}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {m.region} · {m.type}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFavorite(m.id)}
                        className="text-xs text-red-500 hover:underline flex-shrink-0"
                      >
                        제거
                      </button>
                    </div>
                    <div className="text-sm font-semibold text-primary mt-1">
                      {formatKRW(m.price)}
                    </div>
                    <Link
                      href={`/media/${m.id}`}
                      className="text-xs text-gray-400 hover:text-gray-600 mt-1 inline-block"
                    >
                      상세 보기 →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "quotes" && (
        <div>
          {qLoading ? (
            <div className="py-12 text-center">
              <Spinner size="md" label="제안서 불러오는 중…" />
            </div>
          ) : quotes.length === 0 ? (
            <EmptyState
              icon="📄"
              title="아직 제안서가 없습니다"
              description="관심 매체를 장바구니에 담고 제안서를 생성해보세요."
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
            <ul className="space-y-3">
              {quotes.map((q) => (
                <li key={q.id} className="bg-white border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="text-sm font-medium">
                        제안서 #{q.id.slice(-8)}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {formatDate(q.createdAt)} · {q.mediaCount}개 매체 · {q.period}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                      {STATUS_LABEL[q.status] ?? q.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-semibold text-primary">
                      {formatKRW(q.totalAmount)}
                    </span>
                    <div className="flex gap-2">
                      <Link
                        href={`/quote/${q.id}/preview`}
                        className="text-xs px-3 py-1.5 border rounded-md hover:bg-gray-50"
                      >
                        상세
                      </Link>
                      <a
                        href={`/api/quote/${q.id}/pdf`}
                        className="text-xs px-3 py-1.5 bg-primary text-white rounded-md"
                      >
                        PDF
                      </a>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "campaigns" && (
        <div>
          {inProgress.length === 0 ? (
            <EmptyState
              icon="🚀"
              title="진행 중인 캠페인이 없습니다"
              description="제안서가 예약 확정되면 여기에 표시됩니다."
            />
          ) : (
            <ul className="space-y-3">
              {inProgress.map((q) => (
                <li key={q.id} className="bg-white border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="text-sm font-medium">{q.clientCompany ?? q.clientName}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {formatDate(q.startDate)} ~ {formatDate(q.endDate)} · {q.mediaCount}개 매체
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                      {STATUS_LABEL[q.status] ?? q.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-semibold text-primary">
                      {formatKRW(q.totalAmount)}
                    </span>
                    <Link
                      href={`/quote/${q.id}/preview`}
                      className="text-xs px-3 py-1.5 border rounded-md hover:bg-gray-50"
                    >
                      상세
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
