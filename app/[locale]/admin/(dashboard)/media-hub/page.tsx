"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarDays, CloudUpload, ImageIcon, Tag, Code2 } from "lucide-react";
import { Link } from "@/i18n/navigation";

type MediaRow = {
  id: string;
  name: string;
  region: string;
  type: string;
  price: number;
  image: string | null;
};

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
      status: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  const [newPrice, setNewPrice] = useState({ price: "", note: "" });
  const [book, setBook] = useState({
    title: "",
    startsAt: "",
    endsAt: "",
    status: "hold",
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

  const loadList = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/medias");
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
      const [pRes, bRes] = await Promise.all([
        fetch(`/api/admin/medias/${m.id}/prices`),
        fetch(`/api/admin/medias/${m.id}/bookings`),
      ]);
      const pJson = (await pRes.json()) as {
        snapshots?: {
          id: string;
          price: number;
          note: string | null;
          effectiveFrom: string;
        }[];
      };
      const bJson = (await bRes.json()) as {
        bookings?: {
          id: string;
          title: string;
          startsAt: string;
          endsAt: string;
          status: string;
        }[];
      };
      setPrices(
        (pJson.snapshots ?? []).map((s) => ({
          ...s,
          effectiveFrom: new Date(s.effectiveFrom).toISOString().slice(0, 16),
        })),
      );
      setBookings(
        (bJson.bookings ?? []).map((b) => ({
          ...b,
          startsAt: new Date(b.startsAt).toISOString().slice(0, 16),
          endsAt: new Date(b.endsAt).toISOString().slice(0, 16),
        })),
      );
    } catch {
      setPrices([]);
      setBookings([]);
    }
  };

  const addPrice = async () => {
    if (!sel || !newPrice.price) return;
    await fetch(`/api/admin/medias/${sel.id}/prices`, {
      method: "POST",
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

  const addBooking = async () => {
    if (!sel || !book.title || !book.startsAt || !book.endsAt) return;
    await fetch(`/api/admin/medias/${sel.id}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: book.title,
        startsAt: new Date(book.startsAt).toISOString(),
        endsAt: new Date(book.endsAt).toISOString(),
        status: book.status,
      }),
    });
    setBook({ title: "", startsAt: "", endsAt: "", status: "hold" });
    await loadDetail(sel);
  };

  const delBooking = async (id: string) => {
    await fetch(`/api/admin/media-bookings/${id}`, { method: "DELETE" });
    if (sel) await loadDetail(sel);
  };

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !sel) return;
    setUploadMsg(null);
    const sigRes = await fetch("/api/admin/upload/cloudinary", {
      method: "POST",
    });
    if (!sigRes.ok) {
      setUploadMsg("Cloudinary 미설정 또는 서명 실패");
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
    const upJson = (await up.json()) as { secure_url?: string; error?: { message: string } };
    if (!up.ok || !upJson.secure_url) {
      setUploadMsg(upJson.error?.message ?? "업로드 실패");
      return;
    }

    await fetch(`/api/admin/medias/${sel.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: upJson.secure_url }),
    });
    setUploadMsg("이미지 URL이 저장되었습니다.");
    const updated = { ...sel, image: upJson.secure_url };
    setSel(updated);
    await loadDetail(updated);
    await loadList();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-navy">매체 허브 (DB)</h2>
        <p className="text-sm text-muted-foreground">
          Cloudinary 이미지 업로드, 가격 변경 이력, 예약(송출) 캘린더 슬롯을
          관리합니다. 기존 &quot;매체 관리&quot; 화면은 데모용으로 유지됩니다.
        </p>
        <Link
          href="/admin/medias/quick-add"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-gold hover:text-gold-dark"
        >
          <Code2 className="h-4 w-4" />
          JSON 간편 등록 (DB)
        </Link>
      </div>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}

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
            className="bg-navy"
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
                    sel?.id === m.id ? "border-gold bg-gold/5" : "border-slate-200"
                  }`}
                >
                  <p className="font-semibold text-navy">{m.name}</p>
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
            <CardTitle className="text-base">이미지 · 가격 이력 · 예약</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!sel ? (
              <p className="text-sm text-muted-foreground">
                왼쪽에서 매체를 선택하세요.
              </p>
            ) : (
              <>
                <div>
                  <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold">
                    <CloudUpload className="h-4 w-4" />
                    Cloudinary 업로드
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
                    <p className="mt-2 text-xs text-navy">{uploadMsg}</p>
                  ) : null}
                </div>

                <div>
                  <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold">
                    <Tag className="h-4 w-4" />
                    가격 히스토리
                  </h3>
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
                  <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold">
                    <CalendarDays className="h-4 w-4" />
                    예약 / 송출 슬롯
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      placeholder="제목"
                      value={book.title}
                      onChange={(e) =>
                        setBook((b) => ({ ...b, title: e.target.value }))
                      }
                    />
                    <select
                      className="rounded border px-2 py-2 text-sm"
                      value={book.status}
                      onChange={(e) =>
                        setBook((b) => ({ ...b, status: e.target.value }))
                      }
                    >
                      <option value="hold">hold</option>
                      <option value="confirmed">confirmed</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                    <Input
                      type="datetime-local"
                      value={book.startsAt}
                      onChange={(e) =>
                        setBook((b) => ({ ...b, startsAt: e.target.value }))
                      }
                    />
                    <Input
                      type="datetime-local"
                      value={book.endsAt}
                      onChange={(e) =>
                        setBook((b) => ({ ...b, endsAt: e.target.value }))
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-2"
                    onClick={addBooking}
                  >
                    예약 추가
                  </Button>
                  <ul className="mt-2 space-y-2 text-xs">
                    {bookings.map((b) => (
                      <li
                        key={b.id}
                        className="flex items-center justify-between gap-2 rounded border p-2"
                      >
                        <div>
                          <p className="font-medium">{b.title}</p>
                          <p className="text-muted-foreground">
                            {b.startsAt.replace("T", " ")} ~{" "}
                            {b.endsAt.replace("T", " ")} · {b.status}
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
