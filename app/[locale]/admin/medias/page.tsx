"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Upload,
  Download,
  ImagePlus,
  CheckCircle2,
} from "lucide-react";

type MediaItem = {
  id: number;
  name: string;
  nameEn: string;
  location: string;
  region: string;
  type: string;
  price: number;
  active: boolean;
};

const typeLabels: Record<string, string> = {
  billboard: "빌보드",
  digital: "디지털",
  subway: "지하철",
  bus: "버스",
};

const regionLabels: Record<string, string> = {
  seoul: "서울",
  busan: "부산",
  jeju: "제주",
  national: "전국",
};

const initialMedia: MediaItem[] = [
  { id: 1, name: "강남역 대형 빌보드", nameEn: "Gangnam Station Large Billboard", location: "서울 강남구", region: "seoul", type: "billboard", price: 2500, active: true },
  { id: 2, name: "코엑스 디지털 사이니지", nameEn: "COEX Digital Signage", location: "서울 삼성동", region: "seoul", type: "digital", price: 3800, active: true },
  { id: 3, name: "홍대입구역 지하철 광고", nameEn: "Hongdae Station Subway Ad", location: "서울 마포구", region: "seoul", type: "subway", price: 1200, active: true },
  { id: 4, name: "명동 대형 전광판", nameEn: "Myeongdong Large LED", location: "서울 중구", region: "seoul", type: "digital", price: 4200, active: true },
  { id: 5, name: "잠실 롯데월드타워 빌보드", nameEn: "Lotte World Tower Billboard", location: "서울 송파구", region: "seoul", type: "billboard", price: 5000, active: false },
  { id: 6, name: "서면역 디지털 스크린", nameEn: "Seomyeon Station Digital Screen", location: "부산 부산진구", region: "busan", type: "digital", price: 1500, active: true },
  { id: 7, name: "해운대 해변 빌보드", nameEn: "Haeundae Beach Billboard", location: "부산 해운대구", region: "busan", type: "billboard", price: 1800, active: true },
  { id: 8, name: "부산역 지하철 광고", nameEn: "Busan Station Subway Ad", location: "부산 동구", region: "busan", type: "subway", price: 900, active: false },
  { id: 9, name: "제주공항 디지털 광고", nameEn: "Jeju Airport Digital Ad", location: "제주시", region: "jeju", type: "digital", price: 2200, active: true },
  { id: 10, name: "제주 중문관광단지 빌보드", nameEn: "Jungmun Resort Billboard", location: "서귀포시", region: "jeju", type: "billboard", price: 1000, active: true },
  { id: 11, name: "강남대로 버스 쉘터", nameEn: "Gangnam-daero Bus Shelter", location: "서울 강남구", region: "seoul", type: "bus", price: 800, active: true },
  { id: 12, name: "을지로 지하철 랩핑", nameEn: "Euljiro Subway Wrapping", location: "서울 중구", region: "seoul", type: "subway", price: 2000, active: true },
  { id: 13, name: "전국 고속도로 빌보드", nameEn: "National Highway Billboard", location: "전국", region: "national", type: "billboard", price: 3500, active: true },
  { id: 14, name: "전국 시내버스 광고", nameEn: "National City Bus Ad", location: "전국", region: "national", type: "bus", price: 600, active: false },
  { id: 15, name: "여의도 IFC 디지털", nameEn: "Yeouido IFC Digital", location: "서울 영등포구", region: "seoul", type: "digital", price: 3200, active: true },
];

const emptyForm: Omit<MediaItem, "id"> = {
  name: "",
  nameEn: "",
  location: "",
  region: "seoul",
  type: "billboard",
  price: 0,
  active: true,
};

type UploadItem = {
  file: File;
  mediaId: number | null;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  preview: string;
};

const PAGE_SIZE = 8;

export default function AdminMediasPage() {
  const [medias, setMedias] = useState(initialMedia);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    return medias.filter((m) => {
      if (typeFilter !== "all" && m.type !== typeFilter) return false;
      if (search && !m.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [medias, typeFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const openAdd = useCallback(() => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((media: MediaItem) => {
    setEditing(media);
    setForm({
      name: media.name,
      nameEn: media.nameEn,
      location: media.location,
      region: media.region,
      type: media.type,
      price: media.price,
      active: media.active,
    });
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!form.name.trim() || !form.location.trim()) return;

    if (editing) {
      setMedias((prev) =>
        prev.map((m) => (m.id === editing.id ? { ...m, ...form } : m))
      );
    } else {
      const newId = Math.max(...medias.map((m) => m.id), 0) + 1;
      setMedias((prev) => [{ id: newId, ...form }, ...prev]);
    }
    setModalOpen(false);
  }, [editing, form, medias]);

  const handleDelete = useCallback((id: number) => {
    setMedias((prev) => prev.filter((m) => m.id !== id));
    setDeleteConfirm(null);
  }, []);

  const toggleActive = useCallback((id: number) => {
    setMedias((prev) =>
      prev.map((m) => (m.id === id ? { ...m, active: !m.active } : m))
    );
  }, []);

  const handleExportCSV = useCallback(() => {
    const BOM = "\uFEFF";
    const header = ["매체명", "영문명", "위치", "지역", "유형", "가격(만원)", "상태"];
    const rows = medias.map((m) => [
      m.name,
      m.nameEn,
      m.location,
      regionLabels[m.region] || m.region,
      typeLabels[m.type] || m.type,
      String(m.price),
      m.active ? "활성" : "비활성",
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `매체목록_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [medias]);

  const handleFilesSelected = useCallback((files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const newItems: UploadItem[] = imageFiles.map((file) => ({
      file,
      mediaId: null,
      progress: 0,
      status: "pending",
      preview: URL.createObjectURL(file),
    }));
    setUploadItems((prev) => [...prev, ...newItems]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) handleFilesSelected(e.dataTransfer.files);
    },
    [handleFilesSelected],
  );

  const assignMediaToUpload = useCallback((index: number, mediaId: number) => {
    setUploadItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, mediaId } : item)),
    );
  }, []);

  const removeUploadItem = useCallback((index: number) => {
    setUploadItems((prev) => {
      const item = prev[index];
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const startBulkUpload = useCallback(() => {
    setUploadItems((prev) =>
      prev.map((item) => {
        if (item.status !== "pending" || !item.mediaId) return item;
        return { ...item, status: "uploading", progress: 0 };
      }),
    );

    uploadItems.forEach((item, index) => {
      if (item.status !== "pending" || !item.mediaId) return;
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30 + 10;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setUploadItems((prev) =>
            prev.map((it, i) =>
              i === index ? { ...it, progress: 100, status: "done" } : it,
            ),
          );
        } else {
          setUploadItems((prev) =>
            prev.map((it, i) =>
              i === index ? { ...it, progress: Math.min(progress, 99) } : it,
            ),
          );
        }
      }, 300 + Math.random() * 400);
    });
  }, [uploadItems]);

  const allMapped = uploadItems.length > 0 && uploadItems.every((i) => i.mediaId !== null);
  const allDone = uploadItems.length > 0 && uploadItems.every((i) => i.status === "done");

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {[
              { value: "all", label: "전체" },
              { value: "billboard", label: "빌보드" },
              { value: "digital", label: "디지털" },
              { value: "subway", label: "지하철" },
              { value: "bus", label: "버스" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setTypeFilter(opt.value);
                  setPage(1);
                }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  typeFilter === opt.value
                    ? "bg-navy text-white"
                    : "bg-slate-100 text-muted-foreground hover:bg-slate-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 sm:w-56 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="매체명 검색..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setUploadItems([]);
                setUploadModalOpen(true);
              }}
              className="shrink-0"
            >
              <ImagePlus className="h-4 w-4" />
              <span className="hidden sm:inline">사진 업로드</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              className="shrink-0"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">엑셀 다운로드</span>
            </Button>
            <Button
              onClick={openAdd}
              className="bg-gold text-navy hover:bg-gold-dark shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">매체 추가</span>
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-3">매체명</th>
                    <th className="px-4 py-3 hidden sm:table-cell">위치</th>
                    <th className="px-4 py-3">유형</th>
                    <th className="px-4 py-3">가격(만원)</th>
                    <th className="px-4 py-3 text-center">상태</th>
                    <th className="px-4 py-3 text-center">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-12 text-center text-muted-foreground"
                      >
                        검색 결과가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((media) => (
                      <tr
                        key={media.id}
                        className={`border-b last:border-0 transition-colors ${
                          media.active
                            ? "hover:bg-slate-50/80"
                            : "bg-slate-50/50 opacity-60"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-navy">
                            {media.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {media.nameEn}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                          {media.location}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="secondary"
                            className="bg-navy/5 text-navy text-xs"
                          >
                            {typeLabels[media.type]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-semibold text-navy">
                          ₩{media.price.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleActive(media.id)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                              media.active ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                                media.active
                                  ? "translate-x-[18px]"
                                  : "translate-x-0.5"
                              } mt-0.5`}
                            />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => openEdit(media)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirm(media.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <span className="text-xs text-muted-foreground">
                  총 {filtered.length}건 중 {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(page * PAGE_SIZE, filtered.length)}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon-xs"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-xs"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setModalOpen(false)}
          />
          <Card className="relative z-10 w-full max-w-md animate-fade-in-up">
            <CardHeader className="flex-row items-start justify-between">
              <CardTitle className="text-lg text-navy">
                {editing ? "매체 수정" : "매체 추가"}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  매체명 (한국어) *
                </label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="강남역 대형 빌보드"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  매체명 (영어)
                </label>
                <Input
                  value={form.nameEn}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nameEn: e.target.value }))
                  }
                  placeholder="Gangnam Station Large Billboard"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  위치 *
                </label>
                <Input
                  value={form.location}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, location: e.target.value }))
                  }
                  placeholder="서울 강남구"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    지역
                  </label>
                  <select
                    value={form.region}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, region: e.target.value }))
                    }
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  >
                    {Object.entries(regionLabels).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    유형
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, type: e.target.value }))
                    }
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  >
                    {Object.entries(typeLabels).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  가격 (만원)
                </label>
                <Input
                  type="number"
                  value={form.price || ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      price: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder="2500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  취소
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-navy text-white hover:bg-navy-light"
                  disabled={!form.name.trim() || !form.location.trim()}
                >
                  {editing ? "수정" : "추가"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setUploadModalOpen(false)}
          />
          <Card className="relative z-10 w-full max-w-2xl animate-fade-in-up max-h-[85vh] overflow-hidden flex flex-col">
            <CardHeader className="flex-row items-start justify-between shrink-0">
              <CardTitle className="text-lg text-navy">
                매체 사진 일괄 업로드
              </CardTitle>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setUploadModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto">
              {/* Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                  isDragging
                    ? "border-gold bg-gold/5"
                    : "border-slate-200 hover:border-gold/50 hover:bg-slate-50"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy/5">
                  <Upload className="h-6 w-6 text-navy/60" />
                </div>
                <div>
                  <p className="font-medium text-navy">
                    이미지를 드래그하거나 클릭하여 선택
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    JPG, PNG, WebP 지원 · 여러 파일 동시 선택 가능
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFilesSelected(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>

              {/* Upload Items */}
              {uploadItems.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    업로드 파일 ({uploadItems.length}개)
                  </p>
                  {uploadItems.map((item, idx) => (
                    <div
                      key={`${item.file.name}-${idx}`}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <img
                        src={item.preview}
                        alt={item.file.name}
                        className="h-12 w-12 shrink-0 rounded-md object-cover"
                      />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="truncate text-sm font-medium text-navy">
                          {item.file.name}
                        </p>
                        {item.status === "done" ? (
                          <div className="flex items-center gap-1 text-xs text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            업로드 완료
                          </div>
                        ) : item.status === "uploading" ? (
                          <div className="space-y-1">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-gold transition-all"
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {Math.round(item.progress)}%
                            </p>
                          </div>
                        ) : (
                          <select
                            value={item.mediaId ?? ""}
                            onChange={(e) =>
                              assignMediaToUpload(
                                idx,
                                parseInt(e.target.value),
                              )
                            }
                            className="w-full rounded border px-2 py-1 text-xs"
                          >
                            <option value="">매체 선택...</option>
                            {medias.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      {item.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => removeUploadItem(idx)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              {uploadItems.length > 0 && (
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      uploadItems.forEach((i) => URL.revokeObjectURL(i.preview));
                      setUploadItems([]);
                    }}
                  >
                    초기화
                  </Button>
                  {allDone ? (
                    <Button
                      className="bg-navy text-white hover:bg-navy-light"
                      onClick={() => setUploadModalOpen(false)}
                    >
                      완료
                    </Button>
                  ) : (
                    <Button
                      className="bg-navy text-white hover:bg-navy-light"
                      disabled={!allMapped}
                      onClick={startBulkUpload}
                    >
                      <Upload className="h-4 w-4" />
                      업로드 시작
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDeleteConfirm(null)}
          />
          <Card className="relative z-10 w-full max-w-sm animate-fade-in-up">
            <CardContent className="space-y-4 pt-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="font-semibold text-navy">매체를 삭제하시겠습니까?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  이 작업은 되돌릴 수 없습니다.
                </p>
              </div>
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(null)}
                >
                  취소
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(deleteConfirm)}
                >
                  삭제
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
