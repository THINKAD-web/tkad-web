"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  ImageIcon,
  Tag,
  Code2,
  Users,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { AdminBookingRequestsReviewPanel } from "@/components/admin/booking-requests-review-panel";

type MediaAvailability = "available" | "reserved" | "maintenance";

type MediaRow = {
  id: string;
  name: string;
  region: string;
  type: string;
  price: number;
  image: string | null;
  availability?: MediaAvailability;
};

const AVAIL_LABEL: Record<MediaAvailability, string> = {
  available: "예약가능",
  reserved: "예약중",
  maintenance: "점검중",
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function bookingTouchesDay(
  day: Date,
  startsAt: string,
  endsAt: string,
): boolean {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  const a = startOfDay(day).getTime();
  const b = endOfDay(day).getTime();
  return s.getTime() <= b && e.getTime() >= a;
}

export default function AdminMediaHubPage() {
  const [list, setList] = useState<MediaRow[]>([]);
  const [sel, setSel] = useState<MediaRow | null>(null);
  const [prices, setPrices] = useState<
    { id: string; price: number; note: string | null; effectiveFrom: string }[]
  >([]);
  const [bookings, setBookings] = useState<
    {
      id: string;
      title: string;
      startsAt: string;
      endsAt: string;
      /** requested | tentative | confirmed | cancelled | expired */
      status: string;
    }[]
  >([]);
  const [advertiserExecs, setAdvertiserExecs] = useState<
    {
      id: string;
      advertiserName: string;
      campaignLabel: string | null;
      periodStart: string | null;
      periodEnd: string | null;
      note: string | null;
    }[]
  >([]);
  const [availability, setAvailability] =
    useState<MediaAvailability>("available");
  const [calMonth, setCalMonth] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  const [newPrice, setNewPrice] = useState({ price: "", note: "" });
  const [book, setBook] = useState({
    title: "",
    startsAt: "",
    endsAt: "",
    status: "tentative",
  });
  /** 충돌 발견 시 서버가 반환한 충돌 booking 목록 — UI 에 강제 등록 버튼 노출용 */
  const [bookingConflicts, setBookingConflicts] = useState<
    {
      id: string;
      title: string;
      startsAt: string;
      endsAt: string;
      status: string;
      summary: string;
    }[]
  >([]);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [execForm, setExecForm] = useState({
    advertiserName: "",
    campaignLabel: "",
    periodStart: "",
    periodEnd: "",
    note: "",
  });

  const [newMedia, setNewMedia] = useState({
    name: "",
    nameEn: "",
    location: "",
    region: "서울",
    type: "디지털",
    price: "",
    width: "",
    height: "",
  });

  const priceByMonth = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of prices) {
      const d = new Date(p.effectiveFrom);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      m.set(key, p.price);
    }
    return [...m.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12);
  }, [prices]);

  const maxMonthPrice = useMemo(
    () => Math.max(1, ...priceByMonth.map(([, v]) => v)),
    [priceByMonth],
  );

  const calendarCells = useMemo(() => {
    const y = calMonth.getFullYear();
    const mo = calMonth.getMonth();
    const first = new Date(y, mo, 1);
    const last = new Date(y, mo + 1, 0);
    const startPad = (first.getDay() + 6) % 7;
    const days: ({ day: number; date: Date } | null)[] = [];
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) {
      days.push({ day: d, date: new Date(y, mo, d) });
    }
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [calMonth]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/medias", {
        credentials: "include",
      });
      const data = (await res.json()) as { medias?: MediaRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "fail");
      setList(data.medias ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "error");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const createMedia = async () => {
    if (!newMedia.name.trim() || !newMedia.location.trim()) return;
    const price = Math.round(Number(newMedia.price) || 0);
    const res = await fetch("/api/admin/medias", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newMedia.name.trim(),
        nameEn: newMedia.nameEn.trim() || undefined,
        location: newMedia.location.trim(),
        region: newMedia.region.trim(),
        type: newMedia.type.trim(),
        price,
        width: newMedia.width.trim() || undefined,
        height: newMedia.height.trim() || undefined,
      }),
    });
    if (!res.ok) return;
    setNewMedia({
      name: "",
      nameEn: "",
      location: "",
      region: "서울",
      type: "디지털",
      price: "",
      width: "",
      height: "",
    });
    await loadList();
  };

  const loadDetail = async (m: MediaRow) => {
    setSel(m);
    try {
      const res = await fetch(`/api/admin/medias/${m.id}`, {
        credentials: "include",
      });
      const data = (await res.json()) as {
        media?: {
          priceSnapshots: {
            id: string;
            price: number;
            note: string | null;
            effectiveFrom: string;
          }[];
          bookings: {
            id: string;
            title: string;
            startsAt: string;
            endsAt: string;
            status: string;
          }[];
          advertiserExecutions: {
            id: string;
            advertiserName: string;
            campaignLabel: string | null;
            periodStart: string | null;
            periodEnd: string | null;
            note: string | null;
          }[];
          availability?: MediaAvailability;
          image: string | null;
        };
      };
      const media = data.media;
      if (!media) {
        setPrices([]);
        setBookings([]);
        setAdvertiserExecs([]);
        return;
      }
      setAvailability(
        (media.availability as MediaAvailability) ?? "available",
      );
      setPrices(
        (media.priceSnapshots ?? []).map((s) => ({
          ...s,
          effectiveFrom: new Date(s.effectiveFrom).toISOString().slice(0, 16),
        })),
      );
      setBookings(
        (media.bookings ?? []).map((b) => ({
          ...b,
          startsAt: new Date(b.startsAt).toISOString().slice(0, 16),
          endsAt: new Date(b.endsAt).toISOString().slice(0, 16),
        })),
      );
      setAdvertiserExecs(
        (media.advertiserExecutions ?? []).map((x) => ({
          ...x,
          periodStart: x.periodStart
            ? new Date(x.periodStart).toISOString().slice(0, 10)
            : null,
          periodEnd: x.periodEnd
            ? new Date(x.periodEnd).toISOString().slice(0, 10)
            : null,
        })),
      );
      setSel((prev) =>
        prev && prev.id === m.id
          ? { ...prev, image: media.image ?? prev.image, availability: media.availability as MediaAvailability | undefined }
          : prev,
      );
    } catch {
      setPrices([]);
      setBookings([]);
      setAdvertiserExecs([]);
    }
  };

  const saveAvailability = async (v: MediaAvailability) => {
    if (!sel) return;
    setAvailability(v);
    await fetch(`/api/admin/medias/${sel.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availability: v }),
    });
    await loadList();
  };

  const addPrice = async () => {
    if (!sel || !newPrice.price) return;
    await fetch(`/api/admin/medias/${sel.id}/prices`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        price: Number(newPrice.price),
        note: newPrice.note || undefined,
      }),
    });
    setNewPrice({ price: "", note: "" });
    await loadDetail(sel);
    await loadList();
  };

  const addBooking = async ({ force = false } = {}) => {
    if (!sel || !book.title || !book.startsAt || !book.endsAt) return;
    setBookingBusy(true);
    setBookingError(null);
    if (!force) setBookingConflicts([]);
    try {
      const res = await fetch(`/api/admin/medias/${sel.id}/bookings`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: book.title,
          startsAt: new Date(book.startsAt).toISOString(),
          endsAt: new Date(book.endsAt).toISOString(),
          status: book.status,
          force,
        }),
      });
      const data = (await res.json()) as {
        booking?: unknown;
        error?: string;
        code?: string;
        conflicts?: typeof bookingConflicts;
      };
      if (res.status === 409 && data.code === "BOOKING_CONFLICT") {
        // 충돌 발견 — UI 에 충돌 목록 + 강제 등록 버튼 노출
        setBookingConflicts(data.conflicts ?? []);
        setBookingError(data.error ?? "예약 시간이 겹칩니다.");
        return;
      }
      if (!res.ok) {
        setBookingError(data.error ?? "예약 등록 실패");
        return;
      }
      setBook({ title: "", startsAt: "", endsAt: "", status: "tentative" });
      setBookingConflicts([]);
      await loadDetail(sel);
    } catch (e) {
      setBookingError(
        e instanceof Error ? e.message : "예약 등록 중 오류",
      );
    } finally {
      setBookingBusy(false);
    }
  };

  const delBooking = async (id: string) => {
    await fetch(`/api/admin/media-bookings/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (sel) await loadDetail(sel);
  };

  const addAdvertiserExec = async () => {
    if (!sel || !execForm.advertiserName.trim()) return;
    await fetch(`/api/admin/medias/${sel.id}/advertiser-executions`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        advertiserName: execForm.advertiserName.trim(),
        campaignLabel: execForm.campaignLabel.trim() || undefined,
        periodStart: execForm.periodStart || undefined,
        periodEnd: execForm.periodEnd || undefined,
        note: execForm.note.trim() || undefined,
      }),
    });
    setExecForm({
      advertiserName: "",
      campaignLabel: "",
      periodStart: "",
      periodEnd: "",
      note: "",
    });
    await loadDetail(sel);
  };

  const delAdvertiserExec = async (id: string) => {
    await fetch(`/api/admin/media-advertiser-executions/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (sel) await loadDetail(sel);
  };

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !sel) return;
    setUploadMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    const up = await fetch("/api/admin/upload/bunny", {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const upJson = (await up.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!up.ok || !upJson.url) {
      setUploadMsg(upJson.error ?? "업로드 실패");
      return;
    }

    await fetch(`/api/admin/medias/${sel.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: upJson.url }),
    });
    setUploadMsg("이미지 URL이 저장되었습니다.");
    const updated = { ...sel, image: upJson.url };
    setSel(updated);
    await loadDetail(updated);
    await loadList();
  };

  return (
    <div className="space-y-6 text-foreground">
      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          [ MEDIA HUB ]
        </p>
        <h2 className="mt-2 text-lg font-bold tracking-tight">매체 허브 (DB)</h2>
        <p className="text-sm text-muted-foreground">
          가용 상태, 이미지(Bunny CDN), 월별 가격 이력, 예약 캘린더, 광고주 집행 이력을
          관리합니다. 목록·간편 등록은 &quot;매체 관리&quot;와 동일 DB를 사용합니다.
        </p>
        <Link
          href="/admin/medias/quick-add"
          className="mt-2 inline-flex items-center gap-1.5 border-b-2 border-border pb-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground transition-colors hover:text-primary hover:border-primary"
        >
          <Code2 className="h-4 w-4" />
          JSON 간편 등록 (DB)
        </Link>
      </div>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      <AdminBookingRequestsReviewPanel />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">신규 매체 등록</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            placeholder="매체명 *"
            value={newMedia.name}
            onChange={(e) =>
              setNewMedia((m) => ({ ...m, name: e.target.value }))
            }
          />
          <Input
            placeholder="영문명"
            value={newMedia.nameEn}
            onChange={(e) =>
              setNewMedia((m) => ({ ...m, nameEn: e.target.value }))
            }
          />
          <Input
            placeholder="위치 *"
            value={newMedia.location}
            onChange={(e) =>
              setNewMedia((m) => ({ ...m, location: e.target.value }))
            }
          />
          <Input
            placeholder="지역"
            value={newMedia.region}
            onChange={(e) =>
              setNewMedia((m) => ({ ...m, region: e.target.value }))
            }
          />
          <Input
            placeholder="유형"
            value={newMedia.type}
            onChange={(e) =>
              setNewMedia((m) => ({ ...m, type: e.target.value }))
            }
          />
          <Input
            placeholder="가격(원)"
            value={newMedia.price}
            onChange={(e) =>
              setNewMedia((m) => ({ ...m, price: e.target.value }))
            }
          />
          <Input
            placeholder="가로(px 등)"
            value={newMedia.width}
            onChange={(e) =>
              setNewMedia((m) => ({ ...m, width: e.target.value }))
            }
          />
          <Input
            placeholder="세로"
            value={newMedia.height}
            onChange={(e) =>
              setNewMedia((m) => ({ ...m, height: e.target.value }))
            }
          />
          <Button
            type="button"
            className="border-2 border-border bg-foreground text-background transition-colors hover:bg-primary hover:border-primary hover:text-primary-foreground"
            onClick={createMedia}
            disabled={loading}
          >
            DB에 등록
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">매체 목록</CardTitle>
            <Button variant="outline" size="sm" type="button" onClick={loadList}>
              새로고침
            </Button>
          </CardHeader>
          <CardContent className="max-h-[520px] space-y-2 overflow-y-auto text-sm">
            {loading ? (
              <p className="text-muted-foreground">불러오는 중…</p>
            ) : list.length === 0 ? (
              <p className="text-muted-foreground">
                DB에 매체가 없습니다. 시드 또는 API로 먼저 등록하세요.
              </p>
            ) : (
              list.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => loadDetail(m)}
                  className={`w-full rounded-lg border p-3 text-left ${
                    sel?.id === m.id
                      ? "border-primary bg-muted bg-muted/60"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{m.name}</p>
                    {m.availability ? (
                      <Badge variant="secondary" className="text-[10px]">
                        {AVAIL_LABEL[m.availability]}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {m.region} · {m.type}
                  </p>
                  <p className="text-xs">
                    {m.price.toLocaleString()}원
                    {m.image ? (
                      <span className="ml-2 text-emerald-600">이미지 있음</span>
                    ) : null}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">상세 · 캘린더 · 이력</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!sel ? (
              <p className="text-sm text-muted-foreground">
                왼쪽에서 매체를 선택하세요.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold text-foreground">
                    가용 상태
                  </span>
                  <select
                    className="rounded border border-slate-200 px-2 py-1.5 text-sm"
                    value={availability}
                    onChange={(e) =>
                      saveAvailability(e.target.value as MediaAvailability)
                    }
                  >
                    {(Object.keys(AVAIL_LABEL) as MediaAvailability[]).map(
                      (k) => (
                        <option key={k} value={k}>
                          {AVAIL_LABEL[k]}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div>
                  <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold">
                    <CloudUpload className="h-4 w-4" />
                    Bunny 업로드
                  </h3>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-dashed border-slate-300 px-3 py-2 text-xs hover:bg-slate-50">
                    <ImageIcon className="h-4 w-4" />
                    이미지 파일 선택
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onPickImage}
                    />
                  </label>
                  {uploadMsg ? (
                    <p className="mt-2 text-xs text-foreground">{uploadMsg}</p>
                  ) : null}
                </div>

                <div>
                  <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold">
                    <Tag className="h-4 w-4" />
                    가격 히스토리 (월별 스냅샷)
                  </h3>
                  {priceByMonth.length > 0 ? (
                    <div
                      className="mb-3 flex items-end gap-1"
                      style={{ height: 72 }}
                    >
                      {priceByMonth.map(([key, val]) => (
                        <div
                          key={key}
                          className="flex flex-1 flex-col items-center gap-0.5"
                          title={`${key}: ${val.toLocaleString()}원`}
                        >
                          <div
                            className="w-full rounded-t-sm bg-foreground dark:bg-card"
                            style={{
                              height: `${Math.max(4, (val / maxMonthPrice) * 48)}px`,
                            }}
                          />
                          <span className="text-[9px] text-muted-foreground">
                            {key.slice(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Input
                      className="w-32"
                      placeholder="가격(원)"
                      value={newPrice.price}
                      onChange={(e) =>
                        setNewPrice((p) => ({ ...p, price: e.target.value }))
                      }
                    />
                    <Input
                      className="min-w-[120px] flex-1"
                      placeholder="메모"
                      value={newPrice.note}
                      onChange={(e) =>
                        setNewPrice((p) => ({ ...p, note: e.target.value }))
                      }
                    />
                    <Button type="button" size="sm" onClick={addPrice}>
                      기록
                    </Button>
                  </div>
                  <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-xs">
                    {prices.map((p) => (
                      <li key={p.id} className="rounded bg-slate-50 p-1.5">
                        {p.price.toLocaleString()}원 · {p.effectiveFrom}
                        {p.note ? ` · ${p.note}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="flex items-center gap-1 text-sm font-semibold">
                      <CalendarDays className="h-4 w-4" />
                      예약 현황 (월)
                    </h3>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() =>
                          setCalMonth(
                            new Date(
                              calMonth.getFullYear(),
                              calMonth.getMonth() - 1,
                              1,
                            ),
                          )
                        }
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="min-w-[100px] text-center text-xs font-medium">
                        {calMonth.getFullYear()}년 {calMonth.getMonth() + 1}월
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() =>
                          setCalMonth(
                            new Date(
                              calMonth.getFullYear(),
                              calMonth.getMonth() + 1,
                              1,
                            ),
                          )
                        }
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-muted-foreground">
                    {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
                      <div key={d}>{d}</div>
                    ))}
                  </div>
                  <div className="mt-1 grid grid-cols-7 gap-0.5 text-center text-[10px]">
                    {calendarCells.map((cell, idx) => {
                      if (!cell) {
                        return <div key={idx} className="h-7" />;
                      }
                      // 셀에 닿는 booking 중 가장 강한 상태 (confirmed > tentative > requested) 우선 표시
                      const overlapping = bookings.filter((b) =>
                        bookingTouchesDay(cell.date, b.startsAt, b.endsAt),
                      );
                      const strongest = overlapping.find(
                        (b) => b.status === "confirmed",
                      )
                        ? "confirmed"
                        : overlapping.find((b) => b.status === "tentative")
                          ? "tentative"
                          : overlapping.find((b) => b.status === "requested")
                            ? "requested"
                            : null;
                      const cls =
                        strongest === "confirmed"
                          ? "bg-emerald-200 font-semibold text-emerald-900"
                          : strongest === "tentative"
                            ? "bg-primary/30 font-semibold text-foreground"
                            : strongest === "requested"
                              ? "bg-amber-100 font-semibold text-amber-900"
                              : "bg-slate-50 text-foreground";
                      return (
                        <div
                          key={idx}
                          className={`flex h-7 items-center justify-center rounded ${cls}`}
                          title={
                            strongest
                              ? overlapping
                                  .map(
                                    (b) =>
                                      `${b.title} (${b.status})`,
                                  )
                                  .join("\n")
                              : undefined
                          }
                        >
                          {cell.day}
                        </div>
                      );
                    })}
                  </div>
                  {/* status 색상 범례 */}
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-3 w-3 rounded bg-emerald-200" />
                      확정 (confirmed)
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-3 w-3 rounded bg-primary/30" />
                      가홀드 (tentative)
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-3 w-3 rounded bg-amber-100" />
                      신청 (requested)
                    </span>
                  </div>

                  <h4 className="mb-2 mt-4 text-xs font-semibold text-foreground">
                    슬롯 추가
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      placeholder="제목"
                      value={book.title}
                      onChange={(e) => {
                        setBook((b) => ({ ...b, title: e.target.value }));
                        setBookingConflicts([]);
                        setBookingError(null);
                      }}
                    />
                    <select
                      className="rounded border px-2 py-2 text-sm"
                      value={book.status}
                      onChange={(e) => {
                        setBook((b) => ({ ...b, status: e.target.value }));
                        setBookingConflicts([]);
                        setBookingError(null);
                      }}
                    >
                      <option value="tentative">가홀드 (tentative)</option>
                      <option value="confirmed">확정 (confirmed)</option>
                      <option value="cancelled">취소 (cancelled)</option>
                    </select>
                    <Input
                      type="datetime-local"
                      value={book.startsAt}
                      onChange={(e) => {
                        setBook((b) => ({ ...b, startsAt: e.target.value }));
                        setBookingConflicts([]);
                        setBookingError(null);
                      }}
                    />
                    <Input
                      type="datetime-local"
                      value={book.endsAt}
                      onChange={(e) => {
                        setBook((b) => ({ ...b, endsAt: e.target.value }));
                        setBookingConflicts([]);
                        setBookingError(null);
                      }}
                    />
                  </div>

                  {bookingConflicts.length > 0 ? (
                    <div className="mt-2 rounded border-2 border-rose-300 bg-rose-50 p-2 text-xs text-rose-900">
                      <p className="font-semibold">
                        ⚠ 같은 매체에 활성 예약이 겹칩니다 ({bookingConflicts.length}건)
                      </p>
                      <ul className="mt-1 list-disc pl-4">
                        {bookingConflicts.map((c) => (
                          <li key={c.id}>{c.summary}</li>
                        ))}
                      </ul>
                      <p className="mt-2 text-[11px] text-rose-700">
                        그래도 등록하려면 &quot;강제 등록&quot;을 누르세요. (확정 예약과 겹치면 매체사·광고주에게 운영 사고가 될 수 있습니다)
                      </p>
                    </div>
                  ) : null}
                  {bookingError && bookingConflicts.length === 0 ? (
                    <p className="mt-2 text-xs text-rose-700">{bookingError}</p>
                  ) : null}

                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={bookingBusy}
                      onClick={() => void addBooking()}
                    >
                      {bookingBusy ? "등록 중…" : "예약 추가"}
                    </Button>
                    {bookingConflicts.length > 0 ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={bookingBusy}
                        onClick={() => void addBooking({ force: true })}
                      >
                        강제 등록 (충돌 무시)
                      </Button>
                    ) : null}
                  </div>
                  <ul className="mt-2 space-y-2 text-xs">
                    {bookings.map((b) => {
                      const statusLabel: Record<string, string> = {
                        requested: "신청",
                        tentative: "가홀드",
                        confirmed: "확정",
                        cancelled: "취소",
                        expired: "만료",
                      };
                      const statusColor: Record<string, string> = {
                        requested: "bg-amber-100 text-amber-900",
                        tentative: "bg-primary/30 text-foreground",
                        confirmed: "bg-emerald-200 text-emerald-900",
                        cancelled: "bg-slate-200 text-slate-700",
                        expired: "bg-slate-100 text-slate-500",
                      };
                      return (
                        <li
                          key={b.id}
                          className="flex items-center justify-between gap-2 rounded border p-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{b.title}</p>
                            <p className="flex flex-wrap items-center gap-1 text-muted-foreground">
                              <span>
                                {b.startsAt.replace("T", " ")} ~ {b.endsAt.replace("T", " ")}
                              </span>
                              <span
                                className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                                  statusColor[b.status] ?? "bg-slate-100"
                                }`}
                              >
                                {statusLabel[b.status] ?? b.status}
                              </span>
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-rose-600"
                            onClick={() => delBooking(b.id)}
                          >
                            삭제
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div>
                  <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold">
                    <Users className="h-4 w-4" />
                    광고주 집행 이력
                  </h3>
                  <div className="mb-2 grid gap-2 sm:grid-cols-2">
                    <Input
                      placeholder="광고주명 *"
                      value={execForm.advertiserName}
                      onChange={(e) =>
                        setExecForm((f) => ({
                          ...f,
                          advertiserName: e.target.value,
                        }))
                      }
                    />
                    <Input
                      placeholder="캠페인/브랜드명"
                      value={execForm.campaignLabel}
                      onChange={(e) =>
                        setExecForm((f) => ({
                          ...f,
                          campaignLabel: e.target.value,
                        }))
                      }
                    />
                    <Input
                      type="date"
                      value={execForm.periodStart}
                      onChange={(e) =>
                        setExecForm((f) => ({
                          ...f,
                          periodStart: e.target.value,
                        }))
                      }
                    />
                    <Input
                      type="date"
                      value={execForm.periodEnd}
                      onChange={(e) =>
                        setExecForm((f) => ({ ...f, periodEnd: e.target.value }))
                      }
                    />
                    <Input
                      className="sm:col-span-2"
                      placeholder="메모"
                      value={execForm.note}
                      onChange={(e) =>
                        setExecForm((f) => ({ ...f, note: e.target.value }))
                      }
                    />
                  </div>
                  <Button type="button" size="sm" onClick={addAdvertiserExec}>
                    이력 추가
                  </Button>
                  <ul className="mt-2 space-y-2 text-xs">
                    {advertiserExecs.map((x) => (
                      <li
                        key={x.id}
                        className="flex items-start justify-between gap-2 rounded border p-2"
                      >
                        <div>
                          <p className="font-medium">{x.advertiserName}</p>
                          <p className="text-muted-foreground">
                            {x.campaignLabel ?? "—"} ·{" "}
                            {x.periodStart ?? "?"} ~ {x.periodEnd ?? "?"}
                          </p>
                          {x.note ? <p>{x.note}</p> : null}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-rose-600"
                          onClick={() => delAdvertiserExec(x.id)}
                        >
                          삭제
                        </Button>
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
