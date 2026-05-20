"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useLocale } from "next-intl";
import { CalendarRange, Loader2, Trash2 } from "lucide-react";
import {
  MediaOwnerPageLoader,
  ownerGlassCard,
  ownerInputCls,
} from "@/components/media-owner/media-owner-shell";
import { useAppToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";

type MediaRow = {
  id: string;
  name: string;
  region: string;
  type: string;
  price: number;
  portalStatus: string;
  viewCount: number;
  favoriteCount: number;
  inquiryCount: number;
};

type BookingRow = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: string;
  isOwnerBlock: boolean;
};

const STATUS_LABEL: Record<string, { ko: string; en: string; cls: string }> = {
  pending: { ko: "승인대기", en: "Pending", cls: "text-amber-300" },
  active: { ko: "활성", en: "Active", cls: "text-emerald-300" },
  inactive: { ko: "비활성", en: "Inactive", cls: "text-white/40" },
};

export function MediaOwnerMediaClient() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const toast = useAppToast();

  const [media, setMedia] = useState<MediaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [blockFrom, setBlockFrom] = useState("");
  const [blockTo, setBlockTo] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [priceReason, setPriceReason] = useState("");
  const [saving, setSaving] = useState(false);

  const loadMedia = useCallback(async () => {
    const res = await fetch("/api/media-owner/media", { cache: "no-store" });
    const json = await res.json();
    if (json.ok) {
      const list = json.data.media as MediaRow[];
      setMedia(list);
      if (list.length > 0 && !selectedId) setSelectedId(list[0]!.id);
    }
    setLoading(false);
  }, [selectedId]);

  const loadBookings = useCallback(async (mediaId: string) => {
    const res = await fetch(`/api/media-owner/media/${mediaId}/bookings`);
    const json = await res.json();
    if (json.ok) setBookings(json.data.bookings as BookingRow[]);
  }, []);

  useEffect(() => {
    void loadMedia();
  }, [loadMedia]);

  useEffect(() => {
    if (selectedId) void loadBookings(selectedId);
  }, [selectedId, loadBookings]);

  async function addBlock(e: FormEvent) {
    e.preventDefault();
    if (!selectedId || !blockFrom || !blockTo) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/media-owner/media/${selectedId}/bookings`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startsAt: `${blockFrom}T00:00:00.000Z`,
            endsAt: `${blockTo}T23:59:59.000Z`,
          }),
        },
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error?.message ?? (isKo ? "저장 실패" : "Failed"));
        return;
      }
      setBlockFrom("");
      setBlockTo("");
      await loadBookings(selectedId);
      toast.success(isKo ? "집행 불가 기간이 등록되었습니다." : "Block added.");
    } finally {
      setSaving(false);
    }
  }

  async function removeBlock(bookingId: string) {
    if (!selectedId) return;
    const res = await fetch(
      `/api/media-owner/media/${selectedId}/bookings/${bookingId}`,
      { method: "DELETE" },
    );
    const json = await res.json();
    if (res.ok && json.ok) {
      await loadBookings(selectedId);
      toast.success(isKo ? "삭제했습니다." : "Removed.");
    }
  }

  async function requestPriceChange(e: FormEvent) {
    e.preventDefault();
    if (!selectedId || !newPrice) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/media-owner/media/${selectedId}/price-request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestedPrice: Number(newPrice),
            reason: priceReason || null,
          }),
        },
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error?.message ?? (isKo ? "요청 실패" : "Failed"));
        return;
      }
      toast.success(
        isKo ? "단가 수정 요청이 접수되었습니다." : "Price change requested.",
      );
      setNewPrice("");
      setPriceReason("");
    } finally {
      setSaving(false);
    }
  }

  const selected = media.find((m) => m.id === selectedId);

  if (loading) return <MediaOwnerPageLoader />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">
          {isKo ? "내 매체 관리" : "My media"}
        </h2>
        <p className="mt-1 text-sm text-white/60">
          {isKo
            ? "조회·찜·문의 지표와 가용 캘린더, 단가 수정을 관리합니다."
            : "Metrics, availability blocks, and price requests."}
        </p>
      </div>

      {media.length === 0 ? (
        <p className={ownerGlassCard}>
          {isKo ? "등록된 매체가 없습니다." : "No media linked."}
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <ul className="space-y-2">
            {media.map((m) => {
              const st = STATUS_LABEL[m.portalStatus] ?? STATUS_LABEL.inactive!;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(m.id)}
                    className={cn(
                      ownerGlassCard,
                      "w-full text-left transition-colors",
                      selectedId === m.id && "border-violet-400/40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-white">{m.name}</p>
                        <p className="text-xs text-white/50">
                          {m.region} · {m.type}
                        </p>
                      </div>
                      <span className={cn("text-xs font-mono", st.cls)}>
                        {isKo ? st.ko : st.en}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-white/55">
                      {isKo ? "조회" : "Views"} {m.viewCount} ·{" "}
                      {isKo ? "찜" : "Fav"} {m.favoriteCount} ·{" "}
                      {isKo ? "문의" : "Inq."} {m.inquiryCount}
                    </p>
                    <p className="mt-1 font-mono text-sm text-violet-200">
                      ₩{m.price.toLocaleString(isKo ? "ko-KR" : "en-US")}
                      /{isKo ? "월" : "mo"}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>

          {selected ? (
            <div className="space-y-4">
              <div className={ownerGlassCard}>
                <h3 className="flex items-center gap-2 font-semibold text-white">
                  <CalendarRange className="h-4 w-4 text-violet-300" />
                  {isKo ? "집행 불가 기간" : "Blocked dates"}
                </h3>
                <form onSubmit={addBlock} className="mt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      className={ownerInputCls}
                      value={blockFrom}
                      onChange={(e) => setBlockFrom(e.target.value)}
                      required
                    />
                    <input
                      type="date"
                      className={ownerInputCls}
                      value={blockTo}
                      onChange={(e) => setBlockTo(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="inline h-4 w-4 animate-spin" />
                    ) : (
                      isKo ? "블록 추가" : "Add block"
                    )}
                  </button>
                </form>
                <ul className="mt-4 space-y-2 text-sm">
                  {bookings
                    .filter((b) => b.isOwnerBlock)
                    .map((b) => (
                      <li
                        key={b.id}
                        className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2"
                      >
                        <span className="text-white/80">
                          {b.startsAt.slice(0, 10)} ~ {b.endsAt.slice(0, 10)}
                        </span>
                        <button
                          type="button"
                          onClick={() => void removeBlock(b.id)}
                          className="text-red-300 hover:text-red-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  {bookings.filter((b) => b.isOwnerBlock).length === 0 ? (
                    <li className="text-white/40">
                      {isKo ? "등록된 블록 없음" : "No blocks"}
                    </li>
                  ) : null}
                </ul>
              </div>

              <form onSubmit={requestPriceChange} className={ownerGlassCard}>
                <h3 className="font-semibold text-white">
                  {isKo ? "단가 수정 요청" : "Price change request"}
                </h3>
                <p className="mt-1 text-xs text-white/50">
                  {isKo
                    ? `현재 ₩${selected.price.toLocaleString("ko-KR")}/월 — 운영팀 검토 후 반영`
                    : `Current ₩${selected.price.toLocaleString()}/mo`}
                </p>
                <input
                  type="number"
                  className={cn(ownerInputCls, "mt-3")}
                  placeholder={isKo ? "희망 월 단가 (원)" : "Requested monthly price"}
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                />
                <textarea
                  className={cn(ownerInputCls, "mt-2 min-h-[72px] resize-y")}
                  placeholder={isKo ? "변경 사유" : "Reason"}
                  value={priceReason}
                  onChange={(e) => setPriceReason(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={saving || !newPrice}
                  className="mt-3 rounded-xl border border-violet-400/40 px-4 py-2 text-sm text-violet-100 hover:bg-violet-500/10 disabled:opacity-50"
                >
                  {isKo ? "요청 제출" : "Submit request"}
                </button>
              </form>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
