"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { FullPageSpinner, Spinner, EmptyState } from "@/components/ui/spinner";
import { SummaryCards } from "@/components/my/summary-cards";
import { DashboardTabs, type Tab } from "@/components/my/dashboard-tabs";
import { MediaCard, type MediaCardItem } from "@/components/my/media-card";
import { QuoteCard, type QuoteCardItem } from "@/components/my/quote-card";
import { RecentlyViewedSection } from "@/components/my/recently-viewed-section";

type Me = { id: string; email: string; name: string; role: string } | null;

type Favorite = MediaCardItem & {
  visibilityScore: number;
  favoritedAt: string;
};

type Quote = QuoteCardItem & { isInProgress: boolean };

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
    (async () => {
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
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    (async () => {
      setFavLoading(true);
      try {
        const res = await fetch("/api/my/favorites", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && data.ok) setFavorites(data.data.items);
      } finally {
        if (!cancelled) setFavLoading(false);
      }
    })();
    (async () => {
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
    })();
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
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <header className="flex items-start justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            안녕하세요, {me.name}님
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">{me.email}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-1 text-xs sm:text-sm text-gray-500 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">로그아웃</span>
        </button>
      </header>

      <SummaryCards
        favorites={favorites.length}
        inProgress={inProgress.length}
        totalQuotes={quotes.length}
      />

      <RecentlyViewedSection />

      <DashboardTabs
        active={tab}
        onChange={setTab}
        counts={{
          favorites: favorites.length,
          quotes: quotes.length,
          campaigns: inProgress.length,
        }}
      />

      {tab === "favorites" && (
        <FavoritesTab
          loading={favLoading}
          items={favorites}
          onRemove={removeFavorite}
        />
      )}
      {tab === "quotes" && <QuotesTab loading={qLoading} items={quotes} />}
      {tab === "campaigns" && <CampaignsTab items={inProgress} />}
    </div>
  );
}

function FavoritesTab({
  loading,
  items,
  onRemove,
}: {
  loading: boolean;
  items: Favorite[];
  onRemove: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="py-12 text-center">
        <Spinner size="md" label="관심 매체 불러오는 중…" />
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <EmptyState
        icon="⭐"
        title="관심 매체가 없습니다"
        description="지도에서 매체 카드의 하트 아이콘을 눌러 관심 매체로 저장해보세요."
        action={
          <Link
            href="/media/map"
            className="inline-block px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90"
          >
            매체 탐색하러 가기
          </Link>
        }
      />
    );
  }
  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {items.map((m) => (
        <MediaCard key={m.id} item={m} onRemove={onRemove} />
      ))}
    </ul>
  );
}

function QuotesTab({ loading, items }: { loading: boolean; items: Quote[] }) {
  if (loading) {
    return (
      <div className="py-12 text-center">
        <Spinner size="md" label="제안서 불러오는 중…" />
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <EmptyState
        icon="📄"
        title="아직 제안서가 없습니다"
        description="관심 매체를 장바구니에 담고 제안서를 생성해보세요."
        action={
          <Link
            href="/media/map"
            className="inline-block px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90"
          >
            매체 탐색하러 가기
          </Link>
        }
      />
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((q) => (
        <QuoteCard key={q.id} item={q} />
      ))}
    </ul>
  );
}

function CampaignsTab({ items }: { items: Quote[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon="🚀"
        title="진행 중인 캠페인이 없습니다"
        description="제안서가 예약 확정되면 여기에 표시됩니다."
      />
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((q) => (
        <QuoteCard key={q.id} item={q} variant="campaign" />
      ))}
    </ul>
  );
}
