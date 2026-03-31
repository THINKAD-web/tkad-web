"use client";

import dynamic from "next/dynamic";
import {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import {
  Search,
  MapPin,
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
  Code2,
  Loader2,
  AlertCircle,
  Star,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import type { AdminMediaDto, MediaAvailability } from "@/lib/admin-media-dto";
import {
  normalizeAdminMediaRow,
  parseAdminMediaListFromApiJson,
} from "@/lib/admin-media-dto";
import { adminFetchJson } from "@/lib/admin-client-fetch";

const AdminMediaDraggableMap = dynamic(
  () => import("@/components/admin-media-draggable-map"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[260px] animate-pulse rounded-lg bg-slate-100" />
    ),
  },
);

type Props = {
  initialMedias: AdminMediaDto[];
  initialListError: string | null;
};

function typeBadgeLabel(type: string): string {
  const s = type.toLowerCase();
  if (s === "digital") return "디지털";
  if (s === "static") return "고정형";
  if (s === "mobile") return "이동형";
  if (s === "network" || /네트워크/.test(s)) return "네트워크";
  if (/billboard|빌보드|외벽|highway|고속|현수막/.test(s)) return "고정형";
  if (/subway|지하철|랩핑|bus|버스|쉘터|shelter/.test(s)) return "이동형";
  if (/digital|디지털|전광|led|사이니지|signage|미디어폴|screen/.test(s))
    return "디지털";
  return type;
}

function matchesCategoryFilter(type: string, filter: string): boolean {
  if (filter === "all") return true;
  const s = type.toLowerCase();
  switch (filter) {
    case "static":
      return (
        s === "static" ||
        /billboard|빌보드|외벽|highway|고속|현수막/.test(s)
      );
    case "digital":
      return (
        s === "digital" ||
        /디지털|전광|led|사이니지|signage|미디어폴|screen|premium|indoor|apartment/.test(
          s,
        )
      );
    case "mobile":
      return (
        s === "mobile" ||
        /subway|지하철|랩핑|bus|버스|쉘터|shelter/.test(s)
      );
    case "network":
      return s === "network";
    default:
      return true;
  }
}

type AdminMediaForm = {
  name: string;
  nameEn: string;
  location: string;
  city: string;
  district: string;
  region: string;
  type: string;
  price: number;
  latitude: string;
  longitude: string;
  nearbyFacilities: string;
  nearbyStations: string;
  nearbyLandmarks: string;
  addressVerified: boolean;
  /** ISO, display-only (서버 자동 수집 시각) */
  autoPopulatedAt: string;
  dailyFootfall: string;
  weekdayFootfall: string;
  operatingHours: string;
  resolution: string;
  width: string;
  height: string;
  widthM: string;
  heightM: string;
  description: string;
  subCategory: string;
  tags: string;
  priceNote: string;
  priceOptionsJson: string;
  image: string;
  extractedImagesText: string;
  targetAge: string;
  impressions: string;
  reach: string;
  frequency: string;
  cpm: string;
  engagementRate: string;
  visibilityScore: string;
  effectMemo: string;
  /** 광고주 이력 (쉼표 구분) */
  pastAdvertisers: string;
};

const emptyForm: AdminMediaForm = {
  name: "",
  nameEn: "",
  location: "",
  city: "",
  district: "",
  region: "seoul",
  type: "digital",
  price: 0,
  latitude: "",
  longitude: "",
  nearbyFacilities: "",
  nearbyStations: "",
  nearbyLandmarks: "",
  addressVerified: false,
  autoPopulatedAt: "",
  dailyFootfall: "",
  weekdayFootfall: "",
  operatingHours: "",
  resolution: "",
  width: "",
  height: "",
  widthM: "",
  heightM: "",
  description: "",
  subCategory: "",
  tags: "",
  priceNote: "",
  priceOptionsJson: "",
  image: "",
  extractedImagesText: "",
  targetAge: "",
  impressions: "",
  reach: "",
  frequency: "",
  cpm: "",
  engagementRate: "",
  visibilityScore: "0",
  effectMemo: "",
  pastAdvertisers: "",
};

function apiToForm(m: AdminMediaDto): AdminMediaForm {
  return {
    name: m.name,
    nameEn: m.nameEn ?? "",
    location: m.location,
    city: m.city ?? "",
    district: m.district ?? "",
    region: m.region,
    type: m.type,
    price: m.price,
    latitude: m.latitude != null ? String(m.latitude) : "",
    longitude: m.longitude != null ? String(m.longitude) : "",
    nearbyFacilities: m.nearbyFacilities ?? "",
    nearbyStations: m.nearbyStations ?? "",
    nearbyLandmarks: m.nearbyLandmarks ?? "",
    addressVerified: m.addressVerified ?? false,
    autoPopulatedAt: m.autoPopulatedAt ?? "",
    dailyFootfall:
      m.dailyFootfall != null ? String(m.dailyFootfall) : "",
    weekdayFootfall:
      m.weekdayFootfall != null ? String(m.weekdayFootfall) : "",
    operatingHours: m.operatingHours ?? "",
    resolution: m.resolution ?? "",
    width: m.width ?? "",
    height: m.height ?? "",
    widthM: m.widthM != null ? String(m.widthM) : "",
    heightM: m.heightM != null ? String(m.heightM) : "",
    description: m.description ?? "",
    subCategory: m.subCategory ?? "",
    tags: (m.tags ?? []).join(", "),
    priceNote: m.priceNote ?? "",
    priceOptionsJson:
      m.priceOptions != null ? JSON.stringify(m.priceOptions, null, 2) : "",
    image: m.image ?? "",
    extractedImagesText: (m.extractedImages ?? []).join("\n"),
    targetAge: m.targetAge ?? "",
    impressions: m.impressions != null ? String(m.impressions) : "",
    reach: m.reach != null ? String(m.reach) : "",
    frequency: m.frequency != null ? String(m.frequency) : "",
    cpm: m.cpm != null ? String(m.cpm) : "",
    engagementRate:
      m.engagementRate != null ? String(m.engagementRate) : "",
    visibilityScore: String(m.visibilityScore ?? 0),
    effectMemo: m.effectMemo ?? "",
    pastAdvertisers: m.pastAdvertisers ?? "",
  };
}

function parseOptInt(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Math.round(Number(t));
  return Number.isFinite(n) ? n : null;
}

function parseOptFloat(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function formToApiBody(form: AdminMediaForm): Record<string, unknown> {
  const tags = form.tags
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const extractedImages = form.extractedImagesText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const vis = Math.round(Number(form.visibilityScore) || 0);
  let priceOptions: unknown = null;
  const rawOpts = form.priceOptionsJson.trim();
  if (rawOpts) {
    try {
      const parsed = JSON.parse(rawOpts);
      priceOptions = parsed;
    } catch {
      // ignore parse error; keep null
    }
  }
  return {
    name: form.name.trim(),
    nameEn: form.nameEn.trim() || null,
    location: form.location.trim(),
    region: form.region.trim(),
    type: form.type.trim(),
    price: Math.round(form.price) || 0,
    image: form.image.trim() || null,
    width: form.width.trim() || null,
    height: form.height.trim() || null,
    description: form.description.trim() || null,
    subCategory: form.subCategory.trim() || null,
    tags,
    city: form.city.trim() || null,
    district: form.district.trim() || null,
    nearbyFacilities: form.nearbyFacilities.trim() || null,
    nearbyStations: form.nearbyStations.trim() || null,
    nearbyLandmarks: form.nearbyLandmarks.trim() || null,
    addressVerified: form.addressVerified,
    latitude: parseOptFloat(form.latitude),
    longitude: parseOptFloat(form.longitude),
    priceNote: form.priceNote.trim() || null,
    priceOptions,
    widthM: parseOptFloat(form.widthM),
    heightM: parseOptFloat(form.heightM),
    resolution: form.resolution.trim() || null,
    operatingHours: form.operatingHours.trim() || null,
    dailyFootfall: parseOptInt(form.dailyFootfall),
    weekdayFootfall: parseOptInt(form.weekdayFootfall),
    targetAge: form.targetAge.trim() || null,
    impressions: parseOptInt(form.impressions),
    reach: parseOptFloat(form.reach),
    frequency: parseOptFloat(form.frequency),
    cpm: parseOptFloat(form.cpm),
    engagementRate: parseOptFloat(form.engagementRate),
    visibilityScore: Number.isFinite(vis) ? Math.max(0, Math.min(100, vis)) : 0,
    effectMemo: form.effectMemo.trim() || null,
    pastAdvertisers: form.pastAdvertisers.trim() || null,
    extractedImages,
  };
}

type UploadItem = {
  file: File;
  mediaId: string | null;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  preview: string;
};

const PAGE_SIZE = 8;

export default function AdminMediasClient({
  initialMedias,
  initialListError,
}: Props) {
  const [medias, setMedias] = useState<AdminMediaDto[]>(() => initialMedias);
  const [listLoading, setListLoading] = useState(
    () => initialMedias.length === 0 && initialListError == null,
  );
  const [listError, setListError] = useState<string | null>(initialListError);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminMediaDto | null>(null);
  const [form, setForm] = useState<AdminMediaForm>(emptyForm);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [uploadRunning, setUploadRunning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formPrimaryImageInputRef = useRef<HTMLInputElement>(null);
  const formGalleryImageInputRef = useRef<HTMLInputElement>(null);
  const [formImageUploadBusy, setFormImageUploadBusy] = useState(false);
  /** 목록 GET이 저장/삭제보다 늦게 끝나면 옛 데이터로 덮어쓰는 레이스 방지 */
  const listFetchGenRef = useRef(0);

  const [nearbyPreview, setNearbyPreview] = useState<{
    nearbyFacilities: string | null;
    nearestSubway: { name: string; distanceM: number } | null;
  } | null>(null);
  const [nearbyPreviewLoading, setNearbyPreviewLoading] = useState(false);
  const [geoLookupLoading, setGeoLookupLoading] = useState(false);
  const [geoLookupError, setGeoLookupError] = useState<string | null>(null);

  const fetchNearbyPreview = useCallback(async (lat: number, lng: number) => {
    setNearbyPreviewLoading(true);
    try {
      const res = await fetch("/api/admin/geo/nearby-preview", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
      const data = (await res.json()) as {
        error?: string;
        nearbyFacilities?: string | null;
        nearestSubway?: { name: string; distanceM: number } | null;
      };
      if (!res.ok) {
        setNearbyPreview(null);
        return;
      }
      setNearbyPreview({
        nearbyFacilities: data.nearbyFacilities ?? null,
        nearestSubway: data.nearestSubway ?? null,
      });
    } catch {
      setNearbyPreview(null);
    } finally {
      setNearbyPreviewLoading(false);
    }
  }, []);

  const onGeocodeFromAddress = useCallback(async () => {
    const q = form.location.trim();
    if (!q) {
      setGeoLookupError("위치(주소)를 입력하세요.");
      return;
    }
    setGeoLookupError(null);
    setGeoLookupLoading(true);
    try {
      const res = await fetch("/api/admin/geo/lookup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = (await res.json()) as {
        error?: string;
        latitude?: number;
        longitude?: number;
        city?: string;
        district?: string;
      };
      if (!res.ok) {
        setGeoLookupError(data.error ?? "주소를 찾지 못했습니다.");
        return;
      }
      if (data.latitude == null || data.longitude == null) {
        setGeoLookupError("좌표가 없습니다.");
        return;
      }
      setForm((f) => ({
        ...f,
        latitude: String(data.latitude),
        longitude: String(data.longitude),
        city: data.city ?? f.city,
        district: data.district ?? f.district,
      }));
    } catch {
      setGeoLookupError("주소 검색 요청 실패");
    } finally {
      setGeoLookupLoading(false);
    }
  }, [form.location]);

  const onMapPositionChange = useCallback((lat: number, lng: number) => {
    setForm((f) => ({
      ...f,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));
  }, []);

  useEffect(() => {
    if (!modalOpen) {
      setNearbyPreview(null);
      setGeoLookupError(null);
      setNearbyPreviewLoading(false);
      setGeoLookupLoading(false);
    }
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    const lat = parseOptFloat(form.latitude);
    const lng = parseOptFloat(form.longitude);
    if (lat == null || lng == null) {
      setNearbyPreview(null);
      return;
    }
    const t = window.setTimeout(() => {
      void fetchNearbyPreview(lat, lng);
    }, 480);
    return () => clearTimeout(t);
  }, [modalOpen, form.latitude, form.longitude, fetchNearbyPreview]);

  const loadMedias = useCallback(async (opts?: { showSpinner?: boolean }) => {
    const showSpinner = opts?.showSpinner ?? false;
    const gen = ++listFetchGenRef.current;
    if (showSpinner) setListLoading(true);
    setListError(null);
    try {
      const result = await adminFetchJson(
        `/api/admin/medias?take=500&_=${Date.now()}`,
        {
          credentials: "include",
          cache: "no-store",
        },
      );
      if (!result.ok) {
        if (showSpinner && gen === listFetchGenRef.current) {
          setListError(result.message);
          setMedias([]);
        }
        return;
      }
      const raw: unknown = result.data;
      const { medias: next, error: parseErr } =
        parseAdminMediaListFromApiJson(raw);
      if (parseErr) {
        if (showSpinner && gen === listFetchGenRef.current) {
          setListError(parseErr);
          setMedias([]);
        }
        return;
      }
      if (gen !== listFetchGenRef.current) return;
      setMedias(next);
    } catch (e) {
      if (showSpinner && gen === listFetchGenRef.current) {
        const msg = e instanceof Error ? e.message : "목록을 불러오지 못했습니다.";
        setListError(msg);
        setMedias([]);
      }
    } finally {
      if (showSpinner && gen === listFetchGenRef.current) {
        setListLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const hasServerData = initialMedias.length > 0;
    const serverErr = initialListError != null;
    void loadMedias({ showSpinner: !hasServerData && !serverErr });
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.has("updated")) {
        setTypeFilter("all");
        setSearch("");
        setPage(1);
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 초기 서버 props 기준 1회
  }, [loadMedias]);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setTypeFilter("all");
        setSearch("");
        setPage(1);
        void loadMedias({ showSpinner: true });
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [loadMedias]);

  const filtered = useMemo(() => {
    return medias.filter((m) => {
      if (!matchesCategoryFilter(m.type, typeFilter)) return false;
      if (
        search &&
        !m.name.toLowerCase().includes(search.toLowerCase()) &&
        !(m.nameEn ?? "").toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [medias, typeFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const openAdd = useCallback(() => {
    setEditing(null);
    setForm(emptyForm);
    setSaveError(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((media: AdminMediaDto) => {
    setEditing(media);
    setForm(apiToForm(media));
    setSaveError(null);
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.name.trim() || !form.location.trim()) return;
    listFetchGenRef.current += 1;
    setSaveLoading(true);
    setSaveError(null);
    const body = formToApiBody(form);
    if (editing) {
      const row = medias.find((x) => x.id === editing.id);
      body.isActive = row?.isActive !== false;
    }
    try {
      if (editing) {
        const result = await adminFetchJson(
          `/api/admin/medias/${editing.id}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );
        if (!result.ok) {
          setSaveError(result.message);
          return;
        }
        const data = result.data as { media?: unknown; error?: string };
        const patched = data.media
          ? normalizeAdminMediaRow(data.media)
          : null;
        if (patched) {
          setMedias((prev) =>
            prev.map((m) => (m.id === patched.id ? patched : m)),
          );
        } else {
          await loadMedias({ showSpinner: false });
        }
      } else {
        const result = await adminFetchJson("/api/admin/medias", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!result.ok) {
          setSaveError(result.message);
          return;
        }
        const data = result.data as { media?: unknown; error?: string };
        const created = data.media
          ? normalizeAdminMediaRow(data.media)
          : null;
        if (created) {
          setMedias((prev) => [created, ...prev]);
        } else {
          await loadMedias({ showSpinner: false });
        }
      }
      setModalOpen(false);
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "저장 요청을 처리하지 못했습니다.",
      );
    } finally {
      setSaveLoading(false);
    }
  }, [editing, form, loadMedias]);

  const handleDelete = useCallback(
    async (id: string) => {
      listFetchGenRef.current += 1;
      setDeleteLoading(true);
      try {
        const res = await fetch(`/api/admin/medias/${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (res.ok) {
          setMedias((prev) => prev.filter((m) => m.id !== id));
        }
        setDeleteConfirm(null);
      } finally {
        setDeleteLoading(false);
      }
    },
    [],
  );

  const toggleActive = useCallback(async (m: AdminMediaDto) => {
    listFetchGenRef.current += 1;
    const next = !m.isActive;
    try {
      const res = await fetch(`/api/admin/medias/${m.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      if (!res.ok) return;
      setMedias((prev) =>
        prev.map((x) => (x.id === m.id ? { ...x, isActive: next } : x)),
      );
    } catch {
      /* ignore */
    }
  }, []);

  const patchFeaturedFields = useCallback(
    async (
      m: AdminMediaDto,
      patch: { isFeatured?: boolean; featuredOrder?: number | null },
    ) => {
      listFetchGenRef.current += 1;
      try {
        const result = await adminFetchJson(`/api/admin/medias/${m.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!result.ok) return;
        const data = result.data as { media?: unknown };
        const row = data.media ? normalizeAdminMediaRow(data.media) : null;
        if (row) {
          setMedias((prev) => prev.map((x) => (x.id === m.id ? row : x)));
        }
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const handleExportCSV = useCallback(() => {
    const BOM = "\uFEFF";
    const header = [
      "id",
      "매체명",
      "영문명",
      "위치",
      "지역",
      "유형",
      "가격(원)",
      "위도",
      "경도",
      "일일유동",
      "평일유동",
      "운영시간",
      "이미지수",
      "가용상태",
      "활성(목록)",
      "추천(홈)",
      "추천순서",
    ];
    const rows = medias.map((m) => [
      m.id,
      m.name,
      m.nameEn ?? "",
      m.location,
      m.region,
      m.type,
      String(m.price),
      m.latitude != null ? String(m.latitude) : "",
      m.longitude != null ? String(m.longitude) : "",
      m.dailyFootfall != null ? String(m.dailyFootfall) : "",
      m.weekdayFootfall != null ? String(m.weekdayFootfall) : "",
      m.operatingHours ?? "",
      String((m.extractedImages ?? []).length),
      m.availability,
      m.isActive ? "활성" : "비활성",
      m.isFeatured ? "Y" : "",
      m.featuredOrder != null ? String(m.featuredOrder) : "",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `매체목록_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [medias]);

  const handleFilesSelected = useCallback((files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/"),
    );
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
      if (e.dataTransfer.files.length > 0)
        handleFilesSelected(e.dataTransfer.files);
    },
    [handleFilesSelected],
  );

  const assignMediaToUpload = useCallback(
    (index: number, mediaId: string | null) => {
      setUploadItems((prev) =>
        prev.map((item, i) => (i === index ? { ...item, mediaId } : item)),
      );
    },
    [],
  );

  const uploadFileToCloudinary = useCallback(async (file: File): Promise<string> => {
    const sigRes = await fetch("/api/admin/upload/cloudinary", {
      method: "POST",
      credentials: "include",
    });
    if (!sigRes.ok) {
      throw new Error("Cloudinary 서명 실패");
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
    const upJson = (await up.json()) as {
      secure_url?: string;
      error?: { message: string };
    };
    if (!up.ok || !upJson.secure_url) {
      throw new Error(upJson.error?.message ?? "업로드 실패");
    }
    return upJson.secure_url;
  }, []);

  const handleFormPrimaryImagePicked = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file?.type.startsWith("image/")) return;
      setFormImageUploadBusy(true);
      setSaveError(null);
      try {
        const url = await uploadFileToCloudinary(file);
        setForm((f) => ({ ...f, image: url }));
      } catch {
        setSaveError("대표 이미지 업로드에 실패했습니다.");
      } finally {
        setFormImageUploadBusy(false);
      }
    },
    [uploadFileToCloudinary],
  );

  const handleFormGalleryImagePicked = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file?.type.startsWith("image/")) return;
      setFormImageUploadBusy(true);
      setSaveError(null);
      try {
        const url = await uploadFileToCloudinary(file);
        setForm((f) => {
          const cur = f.extractedImagesText.trim();
          return {
            ...f,
            extractedImagesText: cur ? `${cur}\n${url}` : url,
          };
        });
      } catch {
        setSaveError("추가 이미지 업로드에 실패했습니다.");
      } finally {
        setFormImageUploadBusy(false);
      }
    },
    [uploadFileToCloudinary],
  );

  const removeUploadItem = useCallback((index: number) => {
    setUploadItems((prev) => {
      const item = prev[index];
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const startBulkUpload = useCallback(async () => {
    const toRun = uploadItems
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.status === "pending" && item.mediaId);
    if (toRun.length === 0) return;
    listFetchGenRef.current += 1;
    setUploadRunning(true);
    for (const { item, idx } of toRun) {
      setUploadItems((prev) =>
        prev.map((it, i) =>
          i === idx ? { ...it, status: "uploading", progress: 5 } : it,
        ),
      );
      try {
        const secureUrl = await uploadFileToCloudinary(item.file);
        const mid = item.mediaId!;
        const detailRes = await fetch(`/api/admin/medias/${mid}`, {
          credentials: "include",
        });
        const detailJson = (await detailRes.json()) as {
          media?: unknown;
        };
        const detail = detailJson.media
          ? normalizeAdminMediaRow(detailJson.media)
          : null;
        const prevUrls = detail?.extractedImages ?? [];
        const nextUrls = [...prevUrls, secureUrl];
        const primary = detail?.image ?? secureUrl;
        const patchRes = await fetch(`/api/admin/medias/${mid}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            extractedImages: nextUrls,
            image: primary,
          }),
        });
        if (!patchRes.ok) throw new Error("매체 갱신 실패");
        setMedias((ms) =>
          ms.map((m) =>
            m.id === mid
              ? { ...m, extractedImages: nextUrls, image: primary }
              : m,
          ),
        );
        setUploadItems((prev) =>
          prev.map((it, i) =>
            i === idx ? { ...it, progress: 100, status: "done" } : it,
          ),
        );
      } catch {
        setUploadItems((prev) =>
          prev.map((it, i) =>
            i === idx ? { ...it, status: "error", progress: 0 } : it,
          ),
        );
      }
    }
    setUploadRunning(false);
  }, [uploadItems, uploadFileToCloudinary]);

  const allMapped =
    uploadItems.length > 0 && uploadItems.every((i) => i.mediaId !== null);
  const allDone =
    uploadItems.length > 0 && uploadItems.every((i) => i.status === "done");

  const isRowActive = (m: AdminMediaDto) => m.isActive;

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {[
              { value: "all", label: "전체" },
              { value: "digital", label: "디지털" },
              { value: "static", label: "고정형" },
              { value: "mobile", label: "이동형" },
              { value: "network", label: "네트워크" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
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
              disabled={medias.length === 0}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">엑셀 다운로드</span>
            </Button>
            <Button variant="outline" className="shrink-0" asChild>
              <Link
                href="/admin/medias/quick-add"
                className="inline-flex items-center gap-2"
              >
                <Code2 className="h-4 w-4" />
                <span className="hidden sm:inline">JSON 간편 등록</span>
              </Link>
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

        {listError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {listError}
          </div>
        )}

        {!listLoading &&
          medias.length > 0 &&
          filtered.length === 0 &&
          (typeFilter !== "all" || search.trim() !== "") && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              <span>
                필터 또는 검색 때문에 표시되는 매체가 없습니다. (전체{" "}
                {medias.length}건)
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 border-amber-300 bg-white"
                onClick={() => {
                  setTypeFilter("all");
                  setSearch("");
                  setPage(1);
                }}
              >
                전체 보기
              </Button>
            </div>
          )}

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-3">매체명</th>
                    <th className="px-4 py-3 hidden sm:table-cell">위치</th>
                    <th className="px-4 py-3">유형</th>
                    <th className="px-4 py-3">가격(원)</th>
                    <th className="px-4 py-3 text-center">상태</th>
                    <th className="px-4 py-3 text-center">추천</th>
                    <th className="px-4 py-3 text-center w-[5.5rem]">순서</th>
                    <th className="px-4 py-3 text-center">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {listLoading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-12 text-center text-muted-foreground"
                      >
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-navy/40" />
                        <p className="mt-2 text-sm">불러오는 중…</p>
                      </td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-12 text-center text-muted-foreground"
                      >
                        {medias.length === 0
                          ? "등록된 매체가 없습니다. 추가하거나 JSON 간편 등록을 이용하세요."
                          : "조건에 맞는 매체가 없습니다. 상단의 「전체 보기」 또는 유형·검색을 확인하세요."}
                      </td>
                    </tr>
                  ) : (
                    paginated.map((media) => (
                      <tr
                        key={media.id}
                        className={`border-b last:border-0 transition-colors ${
                          isRowActive(media)
                            ? "hover:bg-slate-50/80"
                            : "bg-slate-50/50 opacity-60"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-navy">
                            {media.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {media.nameEn ?? "—"}
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
                            {typeBadgeLabel(media.type)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-semibold text-navy">
                          ₩{media.price.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleActive(media)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                              isRowActive(media)
                                ? "bg-emerald-500"
                                : "bg-slate-300"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                                isRowActive(media)
                                  ? "translate-x-[18px]"
                                  : "translate-x-0.5"
                              } mt-0.5`}
                            />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            title={
                              media.isFeatured
                                ? "추천 해제"
                                : "홈 추천 매체로 지정"
                            }
                            onClick={() =>
                              void patchFeaturedFields(media, {
                                isFeatured: !media.isFeatured,
                              })
                            }
                            className="inline-flex touch-manipulation rounded-full p-1.5 transition-colors hover:bg-amber-50"
                          >
                            <Star
                              className={`h-5 w-5 ${
                                media.isFeatured
                                  ? "fill-amber-400 text-amber-500"
                                  : "text-slate-300"
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Input
                            key={`fo-${media.id}-${media.featuredOrder ?? "n"}`}
                            type="number"
                            min={1}
                            max={99}
                            placeholder="—"
                            disabled={!media.isFeatured}
                            defaultValue={
                              media.featuredOrder != null
                                ? String(media.featuredOrder)
                                : ""
                            }
                            className="mx-auto h-8 w-14 text-center text-xs disabled:opacity-40"
                            onBlur={(e) => {
                              if (!media.isFeatured) return;
                              const raw = e.target.value.trim();
                              if (!raw) {
                                void patchFeaturedFields(media, {
                                  featuredOrder: null,
                                });
                                return;
                              }
                              const n = parseInt(raw, 10);
                              if (!Number.isFinite(n)) return;
                              void patchFeaturedFields(media, {
                                featuredOrder: n,
                              });
                            }}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            <Button variant="outline" size="xs" asChild>
                              <Link href={`/admin/medias/${media.id}/edit`}>
                                JSON 수정
                              </Link>
                            </Button>
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

            {!listLoading && totalPages > 1 && (
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setModalOpen(false)}
            aria-hidden
          />
          <Card className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col animate-fade-in-up overflow-hidden">
            <CardHeader className="flex shrink-0 flex-row items-start justify-between">
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
            <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              {saveError && (
                <p className="text-sm text-red-600">{saveError}</p>
              )}
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
                  위치(주소) *
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    className="flex-1"
                    value={form.location}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, location: e.target.value }))
                    }
                    placeholder="서울 강남구 테헤란로 123"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 border-navy/20"
                    disabled={geoLookupLoading}
                    onClick={() => void onGeocodeFromAddress()}
                  >
                    {geoLookupLoading ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        검색 중…
                      </>
                    ) : (
                      "주소로 지도 이동"
                    )}
                  </Button>
                </div>
                {geoLookupError && (
                  <p className="mt-1 text-xs text-amber-700">{geoLookupError}</p>
                )}
                <p className="mt-1 text-[10px] text-muted-foreground">
                  카카오 주소 검색(KAKAO_REST_API_KEY)으로 위도·경도·시·구를 채웁니다.
                </p>
              </div>

              <AdminMediaDraggableMap
                latitude={parseOptFloat(form.latitude)}
                longitude={parseOptFloat(form.longitude)}
                onPositionChange={onMapPositionChange}
                heightPx={260}
              />

              <div className="rounded-lg border border-navy/10 bg-slate-50/80 p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-navy">
                  <MapPin className="h-3.5 w-3.5 text-gold" />
                  주변 정보 미리보기
                </div>
                {nearbyPreviewLoading ? (
                  <p className="text-xs text-muted-foreground">불러오는 중…</p>
                ) : nearbyPreview ? (
                  <div className="space-y-2 text-xs">
                    {nearbyPreview.nearestSubway && (
                      <p>
                        <span className="font-medium text-navy">인근 지하철: </span>
                        {nearbyPreview.nearestSubway.name}
                        <span className="text-muted-foreground">
                          {" "}
                          (약 {Math.round(nearbyPreview.nearestSubway.distanceM)}m)
                        </span>
                      </p>
                    )}
                    <p>
                      <span className="font-medium text-navy">주변 시설 요약: </span>
                      {nearbyPreview.nearbyFacilities?.trim() ? (
                        <span>{nearbyPreview.nearbyFacilities}</span>
                      ) : (
                        <span className="text-muted-foreground">
                          카카오 REST 키가 없거나 반경 내 결과가 없습니다.
                        </span>
                      )}
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 text-xs"
                      disabled={
                        !nearbyPreview.nearbyFacilities?.trim() &&
                        !nearbyPreview.nearestSubway
                      }
                      onClick={() =>
                        setForm((f) => {
                          const fac = nearbyPreview.nearbyFacilities?.trim();
                          const sub = nearbyPreview.nearestSubway;
                          const stationLine = sub
                            ? `${sub.name} (약 ${Math.round(sub.distanceM)}m)`
                            : null;
                          return {
                            ...f,
                            nearbyFacilities: fac ?? f.nearbyFacilities,
                            nearbyStations: stationLine ?? f.nearbyStations,
                          };
                        })
                      }
                    >
                      미리보기를 필드에 반영
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    위도·경도를 입력하거나 지도에서 핀을 놓으면 표시됩니다.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    시·도 (자동/수정)
                  </label>
                  <Input
                    value={form.city}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, city: e.target.value }))
                    }
                    placeholder="서울"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    구·군
                  </label>
                  <Input
                    value={form.district}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, district: e.target.value }))
                    }
                    placeholder="강남구"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  주변 시설 요약 (저장 시 DB)
                </label>
                <Textarea
                  value={form.nearbyFacilities}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nearbyFacilities: e.target.value }))
                  }
                  placeholder="미리보기에서 반영하거나 직접 입력. 비우면 저장 시 서버가 자동 수집할 수 있습니다."
                  rows={2}
                  className="text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  가까운 지하철역
                </label>
                <Textarea
                  value={form.nearbyStations}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nearbyStations: e.target.value }))
                  }
                  placeholder="예: 강남역 (약 120m)"
                  rows={2}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  주변 랜드마크
                </label>
                <Textarea
                  value={form.nearbyLandmarks}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nearbyLandmarks: e.target.value }))
                  }
                  placeholder="카페, 백화점 등 (비우면 저장 시 자동 수집 가능)"
                  rows={2}
                  className="text-sm"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={form.addressVerified}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, addressVerified: e.target.checked }))
                  }
                />
                주소·좌표 카카오 검증 완료 (addressVerified)
              </label>
              {form.autoPopulatedAt.trim() ? (
                <p className="text-[11px] text-muted-foreground">
                  자동 수집 시각:{" "}
                  {Number.isNaN(Date.parse(form.autoPopulatedAt))
                    ? form.autoPopulatedAt
                    : new Date(form.autoPopulatedAt).toLocaleString("ko-KR")}
                </p>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    지역/코드 *
                  </label>
                  <Input
                    value={form.region}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, region: e.target.value }))
                    }
                    placeholder="seoul, 서울 등"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    유형 *
                  </label>
                  <Input
                    value={form.type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, type: e.target.value }))
                    }
                    placeholder="digital, static, mobile"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  가격 (원)
                </label>
                <Input
                  type="number"
                  value={form.price || ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      price: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  placeholder="35000000"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    위도
                  </label>
                  <Input
                    value={form.latitude}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, latitude: e.target.value }))
                    }
                    placeholder="37.498"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    경도
                  </label>
                  <Input
                    value={form.longitude}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, longitude: e.target.value }))
                    }
                    placeholder="127.0276"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    일일 유동인구
                  </label>
                  <Input
                    value={form.dailyFootfall}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, dailyFootfall: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    평일 유동인구
                  </label>
                  <Input
                    value={form.weekdayFootfall}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        weekdayFootfall: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  운영 시간
                </label>
                <Input
                  value={form.operatingHours}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, operatingHours: e.target.value }))
                  }
                  placeholder="06:00–24:00"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    가로(px·문자열)
                  </label>
                  <Input
                    value={form.width}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, width: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    세로(px·문자열)
                  </label>
                  <Input
                    value={form.height}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, height: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    가로(m)
                  </label>
                  <Input
                    value={form.widthM}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, widthM: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    세로(m)
                  </label>
                  <Input
                    value={form.heightM}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, heightM: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  해상도
                </label>
                <Input
                  value={form.resolution}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, resolution: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  하위 분류
                </label>
                <Input
                  value={form.subCategory}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, subCategory: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  태그 (쉼표 구분)
                </label>
                <Input
                  value={form.tags}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tags: e.target.value }))
                  }
                  placeholder="강남, 역세권"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  가격 비고
                </label>
                <Input
                  value={form.priceNote}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, priceNote: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  가격 옵션 (JSON)
                </label>
                <textarea
                  value={form.priceOptionsJson}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, priceOptionsJson: e.target.value }))
                  }
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono text-navy shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder='[{"label":"20초 기준","price":30000000,"period":"month"},{"label":"15초 기준","price":25000000,"period":"month"}]'
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  예: [{"label":"20초 기준","price":30000000,"period":"month"}] —
                  period는 month/biweekly/week/day 중 하나를 권장합니다.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  대표 이미지 URL
                </label>
                <div className="flex gap-2">
                  <Input
                    className="min-w-0 flex-1"
                    value={form.image}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, image: e.target.value }))
                    }
                    placeholder="https://…"
                  />
                  <input
                    ref={formPrimaryImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void handleFormPrimaryImagePicked(e)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    disabled={formImageUploadBusy}
                    onClick={() => formPrimaryImageInputRef.current?.click()}
                  >
                    {formImageUploadBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    업로드
                  </Button>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Cloudinary에 올린 뒤 URL이 대표 이미지에 채워집니다. 저장을 눌러
                  반영하세요.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  추가 이미지 URL (한 줄에 하나)
                </label>
                <Textarea
                  rows={3}
                  value={form.extractedImagesText}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      extractedImagesText: e.target.value,
                    }))
                  }
                />
                <input
                  ref={formGalleryImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handleFormGalleryImagePicked(e)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 gap-1.5"
                  disabled={formImageUploadBusy}
                  onClick={() => formGalleryImageInputRef.current?.click()}
                >
                  {formImageUploadBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  파일에서 URL 추가
                </Button>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  설명
                </label>
                <Textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    타깃 연령
                  </label>
                  <Input
                    value={form.targetAge}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, targetAge: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    노출(imp)
                  </label>
                  <Input
                    value={form.impressions}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, impressions: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    가시성 점수 0–100
                  </label>
                  <Input
                    value={form.visibilityScore}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        visibilityScore: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    도달률
                  </label>
                  <Input
                    value={form.reach}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, reach: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    빈도
                  </label>
                  <Input
                    value={form.frequency}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, frequency: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    CPM
                  </label>
                  <Input
                    value={form.cpm}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cpm: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    참여율
                  </label>
                  <Input
                    value={form.engagementRate}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        engagementRate: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  광고주 이력 (쉼표 구분)
                </label>
                <Textarea
                  rows={2}
                  value={form.pastAdvertisers}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, pastAdvertisers: e.target.value }))
                  }
                  placeholder="예: 삼성, LG, 현대"
                  className="text-sm"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  비우면 공개 카탈로그·비교표에는 집행 이력(MediaAdvertiserExecution)에서
                  자동 요약됩니다.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  효과 메모
                </label>
                <Textarea
                  rows={2}
                  value={form.effectMemo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, effectMemo: e.target.value }))
                  }
                />
              </div>
              <div className="flex justify-end gap-2 border-t pt-4 pb-1">
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  취소
                </Button>
                <Button
                  onClick={() => void handleSave()}
                  className="bg-navy text-white hover:bg-navy-light"
                  disabled={
                    !form.name.trim() ||
                    !form.location.trim() ||
                    !form.region.trim() ||
                    !form.type.trim() ||
                    saveLoading
                  }
                >
                  {saveLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      저장 중…
                    </>
                  ) : editing ? (
                    "수정"
                  ) : (
                    "추가"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setUploadModalOpen(false)}
            aria-hidden
          />
          <Card className="relative z-10 flex max-h-[85vh] w-full max-w-2xl animate-fade-in-up flex-col overflow-hidden">
            <CardHeader className="flex shrink-0 flex-row items-start justify-between">
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
                    JPG, PNG, WebP 지원 · Cloudinary 연동
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

              {uploadItems.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    업로드 파일 ({uploadItems.length}개)
                  </p>
                  {uploadItems.map((item, idx) => {
                    const assigned =
                      item.mediaId != null
                        ? medias.find((m) => m.id === item.mediaId)
                        : undefined;
                    const previewAlt = assigned
                      ? `${assigned.name} 광고 매체용 업로드 이미지 미리보기 (${assigned.location})`
                      : `광고 매체 이미지 업로드 미리보기: ${item.file.name}`;
                    return (
                      <div
                        key={`${item.file.name}-${idx}`}
                        className="flex items-center gap-3 rounded-lg border p-3"
                      >
                        <Image
                          src={item.preview}
                          alt={previewAlt}
                          width={48}
                          height={48}
                          unoptimized
                          loading="lazy"
                          sizes="48px"
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
                          ) : item.status === "error" ? (
                            <p className="text-xs text-red-600">
                              실패 · Cloudinary 설정을 확인하세요
                            </p>
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
                                  e.target.value || null,
                                )
                              }
                              className="w-full rounded border px-2 py-1 text-xs"
                            >
                              <option value="">매체 선택…</option>
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
                    );
                  })}
                </div>
              )}

              {uploadItems.length > 0 && (
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      uploadItems.forEach((i) =>
                        URL.revokeObjectURL(i.preview),
                      );
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
                      disabled={!allMapped || uploadRunning}
                      onClick={() => void startBulkUpload()}
                    >
                      {uploadRunning ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          업로드 중…
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          업로드 시작
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDeleteConfirm(null)}
            aria-hidden
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
                  disabled={deleteLoading}
                >
                  취소
                </Button>
                <Button
                  variant="destructive"
                  disabled={deleteLoading}
                  onClick={() => void handleDelete(deleteConfirm)}
                >
                  {deleteLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "삭제"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
