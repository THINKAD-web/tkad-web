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
  Layers,
  Loader2,
  AlertCircle,
  Star,
  Flame,
  ShieldCheck,
  Copy,
  FileSpreadsheet,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { MediaGalleryEditor } from "@/components/admin/media-gallery-editor";
import { AdminMediaProposalUpload } from "@/components/admin/admin-media-proposal-upload";
import {
  AdminMediaQualityToolbar,
  MediaQualityScoreBadge,
} from "@/components/admin/admin-media-quality-toolbar";
import { regionZoneLabel } from "@/lib/media-regions";
import { scoreMediaQuality } from "@/lib/media-quality-score";
import {
  clearAdminMediaFormDraft,
  loadAdminMediaFormDraft,
  saveAdminMediaFormDraft,
} from "@/lib/admin-media-form-draft";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import type { AdminMediaDto, MediaAvailability } from "@/lib/admin-media-dto";
import {
  AdminMediaCategoryFields,
  browseFieldsFromDto,
  mergeMediaCategoryForm,
  splitMediaCategoryForm,
  validateBrowseFields,
} from "@/components/admin/admin-media-category-fields";
import type { MediaEngagementMap } from "@/lib/admin-media-engagement";
import {
  normalizeAdminMediaRow,
  parseAdminMediaListFromApiJson,
} from "@/lib/admin-media-dto";
import { adminFetchJson } from "@/lib/admin-client-fetch";
import {
  KOREA_SIDO_ORDERED,
  KOREA_SIGUNGU_COVERAGE,
  centroidOfCoverageCodes,
  inferShortRegionLabelFromCodes,
  sigunguListForSido,
} from "@/lib/geo/korea-sgg-coverage";
import {
  normalizeInstallLocationsFromInput,
  resolveMediaCoordsForSave,
} from "@/lib/media-install-locations";

const AdminMediaInstallLocationsMap = dynamic(
  () => import("@/components/admin-media-install-locations-map"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] animate-pulse rounded-2xl bg-slate-100" />
    ),
  },
);

type InstallLocationRow = {
  key: string;
  label: string;
  location: string;
  latitude: string;
  longitude: string;
};

function newInstallRow(partial?: Partial<InstallLocationRow>): InstallLocationRow {
  return {
    key:
      partial?.key ??
      `loc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: partial?.label ?? "",
    location: partial?.location ?? "",
    latitude: partial?.latitude ?? "",
    longitude: partial?.longitude ?? "",
  };
}

function installRowsFromDto(m: AdminMediaDto): InstallLocationRow[] {
  const installs = m.installLocations ?? [];
  if (installs.length > 0) {
    return installs.map((p, i) =>
      newInstallRow({
        key: `loc-${i}`,
        label: p.label,
        location: p.location ?? "",
        latitude: String(p.latitude),
        longitude: String(p.longitude),
      }),
    );
  }
  if (m.latitude != null && m.longitude != null) {
    return [
      newInstallRow({
        key: "loc-0",
        label: "",
        location: m.location,
        latitude: String(m.latitude),
        longitude: String(m.longitude),
      }),
    ];
  }
  return [newInstallRow()];
}

function syncLegacyLatLngFromRows(
  rows: InstallLocationRow[],
): Pick<AdminMediaForm, "latitude" | "longitude"> {
  const first = rows.find(
    (r) => parseOptFloat(r.latitude) != null && parseOptFloat(r.longitude) != null,
  );
  if (!first) return { latitude: "", longitude: "" };
  return { latitude: first.latitude, longitude: first.longitude };
}

type MediaSortOrder =
  | "updated"
  | "views"
  | "favorites"
  | "inquiries"
  | "popular";

type Props = {
  initialMedias: AdminMediaDto[];
  initialListError: string | null;
  initialEngagement?: MediaEngagementMap;
};

type BunnyUploadApiResponse = {
  url?: string;
  error?: string;
  code?: string;
  details?: string;
  diagnosticId?: string;
};

function formatBunnyUploadError(
  status: number,
  payload: BunnyUploadApiResponse,
): string {
  const base = payload.error?.trim() || `업로드 실패 (HTTP ${status})`;
  const extras = [
    payload.code ? `code: ${payload.code}` : null,
    payload.details?.trim() || null,
    payload.diagnosticId ? `trace: ${payload.diagnosticId}` : null,
  ].filter(Boolean);

  return extras.length > 0 ? `${base} [${extras.join(" | ")}]` : base;
}

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

const ADMIN_MEDIA_AVAILABILITY_LABEL: Record<MediaAvailability, string> = {
  available: "예약가능",
  reserved: "예약중",
  maintenance: "점검중",
};

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
  /** 복수 설치 지점 (휴게소 상·하행 등) */
  installLocations: InstallLocationRow[];
  nearbyFacilities: string;
  nearbyStations: string;
  nearbyLandmarks: string;
  addressVerified: boolean;
  /** 공개 카탈로그 THINKAD Verified 리본 */
  isVerified: boolean;
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
  mediaCategoryParent: string;
  mediaCategorySubs: string[];
  targetCategories: string[];
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
  /** 이동형 — 전국 시·군·구 행정코드(5자리) 다중 선택 */
  coverageDistrictCodes: string[];
  browseMainCategory: string;
  browseSubCategory: string;
  browseRegionMain: string;
  browseRegionSub: string;
};

function galleryUrlsFromForm(form: AdminMediaForm): string[] {
  const gallery = form.extractedImagesText.trim().split("\n").filter(Boolean);
  const primary = form.image.trim();
  if (primary) return [primary, ...gallery.filter((u) => u !== primary)];
  return gallery;
}

function applyGalleryUrlsToForm(
  urls: string[],
): Pick<AdminMediaForm, "image" | "extractedImagesText"> {
  if (urls.length === 0) return { image: "", extractedImagesText: "" };
  return {
    image: urls[0]!,
    extractedImagesText: urls.slice(1).join("\n"),
  };
}

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
  installLocations: [newInstallRow()],
  nearbyFacilities: "",
  nearbyStations: "",
  nearbyLandmarks: "",
  addressVerified: false,
  isVerified: false,
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
  mediaCategoryParent: "",
  mediaCategorySubs: [],
  targetCategories: [],
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
  coverageDistrictCodes: [],
  browseMainCategory: "",
  browseSubCategory: "",
  browseRegionMain: "",
  browseRegionSub: "",
};

type PriceOptDraft = {
  key: string;
  label: string;
  price: string;
  period: string;
  description: string;
};

const PRICE_PERIOD_KEYS = ["month", "biweekly", "week", "day"] as const;
type PricePeriodKey = (typeof PRICE_PERIOD_KEYS)[number];

/** DB·레거시 JSON의 `period` 문자열을 select value와 맞춤 (예: "1개월" → month) */
function normalizePricePeriodForSelect(raw: unknown): PricePeriodKey {
  if (typeof raw !== "string") return "month";
  const t = raw.trim();
  if ((PRICE_PERIOD_KEYS as readonly string[]).includes(t))
    return t as PricePeriodKey;
  const lower = t.toLowerCase();
  if ((PRICE_PERIOD_KEYS as readonly string[]).includes(lower))
    return lower as PricePeriodKey;
  if (/2\s*주|이주|biweek|격주/i.test(t)) return "biweekly";
  if (/일간|매일|per\s*day|\bday\b|^일$/i.test(t)) return "day";
  if (/주간|매주|per\s*week|\bweek\b|^주$/i.test(t) && !/2\s*주|이주/i.test(t))
    return "week";
  if (/개월|월\s*단|월간|per\s*month|\bmonth|^\d+\s*개월/i.test(t)) return "month";
  return "month";
}

function newPriceOptDraft(): PriceOptDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    label: "",
    price: "",
    period: "month",
    description: "",
  };
}

function priceOptDraftsFromJson(jsonStr: string): PriceOptDraft[] {
  const t = jsonStr.trim();
  if (!t) return [];
  try {
    const p = JSON.parse(t) as unknown;
    if (!Array.isArray(p)) return [];
    return p.map((x, i) => {
      const o =
        x && typeof x === "object" && !Array.isArray(x)
          ? (x as Record<string, unknown>)
          : {};
      return {
        key: `row-${i}-${Math.random().toString(36).slice(2, 9)}`,
        label: typeof o.label === "string" ? o.label : "",
        price:
          typeof o.price === "number"
            ? String(o.price)
            : typeof o.price === "string"
              ? o.price
              : "",
        period: normalizePricePeriodForSelect(o.period),
        description:
          typeof o.description === "string" ? o.description : "",
      };
    });
  } catch {
    return [];
  }
}

function jsonStringFromPriceOptDrafts(rows: PriceOptDraft[]): string {
  const arr = rows
    .filter((r) => r.label.trim())
    .map((r) => {
      const price = Number(r.price);
      const o: Record<string, unknown> = {
        label: r.label.trim(),
        price: Number.isFinite(price) ? price : 0,
      };
      if (r.period.trim()) o.period = r.period.trim();
      if (r.description.trim()) o.description = r.description.trim();
      return o;
    });
  return arr.length > 0 ? JSON.stringify(arr, null, 2) : "";
}

function validatePriceOptionsJsonField(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const p = JSON.parse(t) as unknown;
    if (!Array.isArray(p)) {
      return "가격 옵션은 JSON 배열이어야 합니다.";
    }
    for (let i = 0; i < p.length; i++) {
      const row = p[i];
      if (row === null || typeof row !== "object" || Array.isArray(row)) {
        return `가격 옵션[${i}]: 객체가 아닙니다.`;
      }
      const o = row as Record<string, unknown>;
      if (typeof o.label !== "string" || !o.label.trim()) {
        return `가격 옵션[${i}]: label이 필요합니다.`;
      }
      if (typeof o.price !== "number" || !Number.isFinite(o.price)) {
        return `가격 옵션[${i}]: price는 숫자여야 합니다.`;
      }
    }
    return null;
  } catch {
    return "가격 옵션 JSON을 파싱할 수 없습니다.";
  }
}

function apiToForm(m: AdminMediaDto): AdminMediaForm {
  const { parentSlug, subSlugs } = splitMediaCategoryForm(m.mediaCategory ?? []);
  const browse = browseFieldsFromDto(m);
  return {
    name: m.name,
    nameEn: m.nameEn ?? "",
    location: m.location,
    city: m.city ?? "",
    district: m.district ?? "",
    region: m.region,
    type: m.type,
    price: m.price,
    ...(() => {
      const installLocations = installRowsFromDto(m);
      return {
        installLocations,
        ...syncLegacyLatLngFromRows(installLocations),
      };
    })(),
    nearbyFacilities: m.nearbyFacilities ?? "",
    nearbyStations: m.nearbyStations ?? "",
    nearbyLandmarks: m.nearbyLandmarks ?? "",
    addressVerified: m.addressVerified ?? false,
    isVerified: m.isVerified ?? false,
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
    mediaCategoryParent: parentSlug,
    mediaCategorySubs: subSlugs,
    targetCategories: [...(m.targetCategory ?? [])],
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
    coverageDistrictCodes: [...(m.coverageDistrictCodes ?? [])],
    browseMainCategory: browse.browseMain,
    browseSubCategory: browse.browseSub,
    browseRegionMain: browse.regionMain,
    browseRegionSub: browse.regionSub,
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
  const galleryLines = form.extractedImagesText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const imageInput = form.image.trim();
  /** 대표 URL: 입력 필드 우선, 비어 있으면 갤러리 첫 줄(공개 카탈로그가 image → extracted 순으로 병합하므로 일치시킴) */
  const primaryImage = imageInput || galleryLines[0] || null;
  /** 대표와 동일한 URL은 extracted 에서 제외해 DB·목록에 이중 저장되지 않게 함 */
  const extractedImages = primaryImage
    ? galleryLines.filter((u) => u !== primaryImage)
    : galleryLines;
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
    image: primaryImage,
    width: form.width.trim() || null,
    height: form.height.trim() || null,
    description: form.description.trim() || null,
    subCategory: form.subCategory.trim() || null,
    mediaMainCategory: form.browseMainCategory.trim() || null,
    mediaSubCategory: form.browseSubCategory.trim() || null,
    regionMain: form.browseRegionMain.trim() || null,
    regionSub: form.browseRegionSub.trim() || null,
    mediaCategory: mergeMediaCategoryForm(
      form.mediaCategoryParent,
      form.mediaCategorySubs,
      form.browseMainCategory.trim() || undefined,
      form.browseSubCategory.trim() || undefined,
    ),
    targetCategory: [...form.targetCategories],
    tags,
    city: form.city.trim() || null,
    district: form.district.trim() || null,
    nearbyFacilities: form.nearbyFacilities.trim() || null,
    nearbyStations: form.nearbyStations.trim() || null,
    nearbyLandmarks: form.nearbyLandmarks.trim() || null,
    addressVerified: form.addressVerified,
    isVerified: form.isVerified,
    ...(() => {
      const installLocs =
        normalizeInstallLocationsFromInput(form.installLocations) ?? [];
      const resolved = resolveMediaCoordsForSave({
        installLocations: installLocs.length > 0 ? installLocs : null,
        latitude: parseOptFloat(form.latitude),
        longitude: parseOptFloat(form.longitude),
      });
      return {
        installLocations: resolved.installLocations,
        latitude: resolved.latitude,
        longitude: resolved.longitude,
      };
    })(),
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
    coverageDistrictCodes:
      form.type.trim() === "mobile" ? form.coverageDistrictCodes : [],
  };
}

type UploadItem = {
  file: File;
  mediaId: string | null;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  preview: string;
};

const ADMIN_MEDIAS_PAGE_SIZE_KEY = "tkad-admin-medias-page-size-v1";
const PAGE_SIZE_OPTIONS = [8, 12, 24, 50, 100, 150, 200] as const;
type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

function clampPageSize(n: number): PageSizeOption {
  const v = Number.isFinite(n) ? Math.trunc(n) : 8;
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(v)
    ? (v as PageSizeOption)
    : 8;
}

type PublicListFilter = "all" | "public" | "hidden";
type AvailabilityListFilter = "all" | MediaAvailability;
type QualityListFilter = "all" | "low";

function mediaQualityScore(m: AdminMediaDto): number {
  const images = [
    ...(m.image?.trim() ? [m.image] : []),
    ...(m.extractedImages ?? []),
  ];
  return scoreMediaQuality({
    image: m.image,
    extractedImages: images,
    latitude: m.latitude,
    longitude: m.longitude,
    tags: m.tags,
    impressions: m.impressions,
    dailyFootfall: m.dailyFootfall,
    description: m.description,
    price: m.price,
    name: m.name,
    location: m.location,
  }).score;
}

function engagementScore(
  map: MediaEngagementMap,
  id: string,
): number {
  const e = map[id];
  if (!e) return 0;
  return e.viewCount + e.favoriteCount * 2 + e.inquiryCount * 3;
}

export default function AdminMediasClient({
  initialMedias,
  initialListError,
  initialEngagement = {},
}: Props) {
  const searchParams = useSearchParams();
  const [medias, setMedias] = useState<AdminMediaDto[]>(() => initialMedias);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [duplicateBusyId, setDuplicateBusyId] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(
    () => initialMedias.length === 0 && initialListError == null,
  );
  const [listError, setListError] = useState<string | null>(initialListError);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<MediaSortOrder>("updated");
  const [engagement, setEngagement] =
    useState<MediaEngagementMap>(initialEngagement);
  const [publicFilter, setPublicFilter] = useState<PublicListFilter>("all");
  const [availabilityFilter, setAvailabilityFilter] =
    useState<AvailabilityListFilter>("all");
  const [qualityFilter, setQualityFilter] = useState<QualityListFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(8);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADMIN_MEDIAS_PAGE_SIZE_KEY);
      if (raw != null && raw !== "") {
        setPageSize(clampPageSize(Number.parseInt(raw, 10)));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const onPageSizeChange = useCallback((next: number) => {
    const v = clampPageSize(next);
    setPageSize(v);
    setPage(1);
    try {
      localStorage.setItem(ADMIN_MEDIAS_PAGE_SIZE_KEY, String(v));
    } catch {
      /* ignore */
    }
  }, []);

  const resetListFilters = useCallback(() => {
    setTypeFilter("all");
    setSortOrder("updated");
    setSearch("");
    setPublicFilter("all");
    setAvailabilityFilter("all");
    setQualityFilter("all");
    setPage(1);
    setSelectedIds(new Set());
  }, []);

  const lowQualityCount = useMemo(
    () => medias.filter((m) => mediaQualityScore(m) < 60).length,
    [medias],
  );

  const refreshEngagement = useCallback(async () => {
    try {
      const result = await adminFetchJson("/api/admin/medias/engagement", {
        credentials: "include",
        cache: "no-store",
      });
      if (result.ok && result.data && typeof result.data === "object") {
        const eng = (result.data as { engagement?: MediaEngagementMap })
          .engagement;
        if (eng && typeof eng === "object") setEngagement(eng);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminMediaDto | null>(null);
  const [form, setForm] = useState<AdminMediaForm>(emptyForm);
  /** 가격 옵션 카드 UI — 저장 시 `form.priceOptionsJson`과 동기화 */
  const [priceOptDrafts, setPriceOptDrafts] = useState<PriceOptDraft[]>([]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [uploadRunning, setUploadRunning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const [activeInstallKey, setActiveInstallKey] = useState<string | null>(null);
  const [coverageSidoFilter, setCoverageSidoFilter] = useState("서울특별시");
  const [coverageSigunguSearch, setCoverageSigunguSearch] = useState("");

  const coverageRowsForPicker = useMemo(
    () => [...sigunguListForSido(coverageSidoFilter)],
    [coverageSidoFilter],
  );

  const coverageSidoShortLabel = useMemo(
    () =>
      coverageSidoFilter
        .replace(/특별자치시$/, "")
        .replace(/특별자치도$/, "")
        .replace(/특별시$/, "")
        .replace(/광역시$/, "")
        .replace(/도$/, "")
        .trim(),
    [coverageSidoFilter],
  );

  const coverageRowsSelectedCount = useMemo(() => {
    const selected = new Set(form.coverageDistrictCodes);
    let count = 0;
    for (const row of coverageRowsForPicker) {
      if (selected.has(row.code)) count += 1;
    }
    return count;
  }, [form.coverageDistrictCodes, coverageRowsForPicker]);

  const coverageRowsAllSelected =
    coverageRowsForPicker.length > 0 &&
    coverageRowsSelectedCount === coverageRowsForPicker.length;

  const coverageSearchHits = useMemo(() => {
    const q = coverageSigunguSearch.trim();
    if (q.length < 1) return [];
    const lower = q.toLowerCase();
    return KOREA_SIGUNGU_COVERAGE.filter(
      (r) =>
        r.nameKo.includes(q) ||
        r.code.includes(q) ||
        r.nameKo.toLowerCase().includes(lower),
    ).slice(0, 50);
  }, [coverageSigunguSearch]);

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
        region?: string;
        regionZone?: string | null;
      };
      if (!res.ok) {
        setGeoLookupError(data.error ?? "주소를 찾지 못했습니다.");
        return;
      }
      if (data.latitude == null || data.longitude == null) {
        setGeoLookupError("좌표가 없습니다.");
        return;
      }
      setForm((f) => {
        const targetKey =
          activeInstallKey ?? f.installLocations[0]?.key ?? newInstallRow().key;
        const nextRows =
          f.installLocations.length > 0
            ? f.installLocations.map((r) =>
                r.key === targetKey
                  ? {
                      ...r,
                      latitude: String(data.latitude),
                      longitude: String(data.longitude),
                      location: r.location.trim() || f.location.trim(),
                    }
                  : r,
              )
            : [
                newInstallRow({
                  key: targetKey,
                  latitude: String(data.latitude),
                  longitude: String(data.longitude),
                  location: f.location.trim(),
                }),
              ];
        return {
          ...f,
          installLocations: nextRows,
          ...syncLegacyLatLngFromRows(nextRows),
          city: data.city ?? f.city,
          district: data.district ?? f.district,
          region:
            typeof data.region === "string" && data.region
              ? data.region
              : f.region,
        };
      });
    } catch {
      setGeoLookupError("주소 검색 요청 실패");
    } finally {
      setGeoLookupLoading(false);
    }
  }, [form.location, activeInstallKey]);

  const onInstallPointMove = useCallback((id: string, lat: number, lng: number) => {
    setForm((f) => {
      const nextRows = f.installLocations.map((r) =>
        r.key === id
          ? { ...r, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }
          : r,
      );
      return {
        ...f,
        installLocations: nextRows,
        ...syncLegacyLatLngFromRows(nextRows),
      };
    });
  }, []);

  const installMapPoints = useMemo(
    () =>
      form.installLocations
        .map((r) => {
          const lat = parseOptFloat(r.latitude);
          const lng = parseOptFloat(r.longitude);
          if (lat == null || lng == null) return null;
          return {
            id: r.key,
            label: r.label.trim() || undefined,
            latitude: lat,
            longitude: lng,
          };
        })
        .filter((p): p is NonNullable<typeof p> => p != null),
    [form.installLocations],
  );

  useEffect(() => {
    if (!modalOpen) {
      setNearbyPreview(null);
      setGeoLookupError(null);
      setNearbyPreviewLoading(false);
      setGeoLookupLoading(false);
      setActiveInstallKey(null);
    }
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    const firstKey = form.installLocations[0]?.key ?? null;
    setActiveInstallKey((prev) => {
      if (prev && form.installLocations.some((r) => r.key === prev)) return prev;
      return firstKey;
    });
  }, [modalOpen, editing?.id, form.installLocations]);

  useEffect(() => {
    if (!modalOpen) return;
    const activeRow =
      form.installLocations.find((r) => r.key === activeInstallKey) ??
      form.installLocations[0];
    const lat = parseOptFloat(activeRow?.latitude ?? form.latitude);
    const lng = parseOptFloat(activeRow?.longitude ?? form.longitude);
    if (lat == null || lng == null) {
      setNearbyPreview(null);
      return;
    }
    const t = window.setTimeout(() => {
      void fetchNearbyPreview(lat, lng);
    }, 480);
    return () => clearTimeout(t);
  }, [
    modalOpen,
    form.latitude,
    form.longitude,
    form.installLocations,
    activeInstallKey,
    fetchNearbyPreview,
  ]);

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
      void refreshEngagement();
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
  }, [refreshEngagement]);

  useEffect(() => {
    const hasServerData = initialMedias.length > 0;
    const serverErr = initialListError != null;
    void loadMedias({ showSpinner: !hasServerData && !serverErr });
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.has("updated")) {
        resetListFilters();
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 초기 서버 props 기준 1회
  }, [loadMedias, resetListFilters]);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        resetListFilters();
        void loadMedias({ showSpinner: true });
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [loadMedias, resetListFilters]);

  const filtered = useMemo(() => {
    const list = medias.filter((m) => {
      if (!matchesCategoryFilter(m.type, typeFilter)) return false;
      if (publicFilter === "public" && !m.isActive) return false;
      if (publicFilter === "hidden" && m.isActive) return false;
      if (
        availabilityFilter !== "all" &&
        m.availability !== availabilityFilter
      ) {
        return false;
      }
      if (
        search &&
        !m.name.toLowerCase().includes(search.toLowerCase()) &&
        !(m.nameEn ?? "").toLowerCase().includes(search.toLowerCase()) &&
        !m.location.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      if (qualityFilter === "low" && mediaQualityScore(m) >= 60) {
        return false;
      }
      return true;
    });

    if (sortOrder === "updated") return list;

    const sorted = [...list];
    const stat = (id: string, key: "viewCount" | "favoriteCount" | "inquiryCount") =>
      engagement[id]?.[key] ?? 0;

    sorted.sort((a, b) => {
      if (sortOrder === "popular") {
        return engagementScore(engagement, b.id) - engagementScore(engagement, a.id);
      }
      if (sortOrder === "views") return stat(b.id, "viewCount") - stat(a.id, "viewCount");
      if (sortOrder === "favorites") {
        return stat(b.id, "favoriteCount") - stat(a.id, "favoriteCount");
      }
      if (sortOrder === "inquiries") {
        return stat(b.id, "inquiryCount") - stat(a.id, "inquiryCount");
      }
      return 0;
    });
    return sorted;
  }, [
    medias,
    typeFilter,
    search,
    publicFilter,
    availabilityFilter,
    qualityFilter,
    sortOrder,
    engagement,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filtered.length / pageSize));
    setPage((p) => Math.min(p, maxPage));
  }, [filtered.length, pageSize]);

  const openAdd = useCallback((prefill?: AdminMediaForm) => {
    setEditing(null);
    setForm(prefill ?? emptyForm);
    setPriceOptDrafts([]);
    setSaveError(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((media: AdminMediaDto) => {
    const f = apiToForm(media);
    setEditing(media);
    setForm(f);
    setPriceOptDrafts(priceOptDraftsFromJson(f.priceOptionsJson));
    setSaveError(null);
    setModalOpen(true);
  }, []);

  const duplicateMedia = useCallback(
    async (media: AdminMediaDto) => {
      setDuplicateBusyId(media.id);
      try {
        const res = await adminFetchJson(
          `/api/admin/medias/${media.id}/duplicate`,
          { method: "POST", credentials: "include" },
        );
        if (!res.ok) {
          setListError(res.message || "복제에 실패했습니다.");
          return;
        }
        const data = res.data as { media?: unknown; error?: string };
        const row = data.media
          ? normalizeAdminMediaRow(data.media)
          : null;
        if (row) {
          setMedias((prev) => [row, ...prev]);
          openEdit(row);
        }
      } finally {
        setDuplicateBusyId(null);
      }
    },
    [openEdit],
  );

  const deleteBunnyImage = useCallback(async (url: string) => {
    const res = await fetch("/api/admin/upload/bunny/delete", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || "Bunny 이미지 삭제에 실패했습니다.");
    }
  }, []);

  const queryHandledRef = useRef(false);
  useEffect(() => {
    if (queryHandledRef.current) return;
    const action = searchParams.get("action");
    const dupId = searchParams.get("duplicate");
    if (!action && !dupId) return;
    queryHandledRef.current = true;
    if (action === "new") {
      const draft = loadAdminMediaFormDraft();
      if (draft && !draft.editingId) {
        setForm(draft.form as AdminMediaForm);
        setPriceOptDrafts((draft.priceOptDrafts as PriceOptDraft[]) ?? []);
        setDraftSavedAt(draft.savedAt);
      }
      setEditing(null);
      setModalOpen(true);
    } else if (dupId) {
      const src = medias.find((m) => m.id === dupId);
      if (src) void duplicateMedia(src);
    }
  }, [searchParams, medias, duplicateMedia]);

  useEffect(() => {
    if (!modalOpen || editing) return;
    const id = window.setInterval(() => {
      saveAdminMediaFormDraft({
        form: form as unknown as Record<string, unknown>,
        priceOptDrafts,
        editingId: null,
        savedAt: new Date().toISOString(),
      });
      setDraftSavedAt(new Date().toISOString());
    }, 30_000);
    return () => window.clearInterval(id);
  }, [modalOpen, editing, form, priceOptDrafts]);

  const applyPriceOptDrafts = useCallback((rows: PriceOptDraft[]) => {
    setPriceOptDrafts(rows);
    setForm((prev) => ({
      ...prev,
      priceOptionsJson: jsonStringFromPriceOptDrafts(rows),
    }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.name.trim() || !form.location.trim()) return;
    const poErr = validatePriceOptionsJsonField(form.priceOptionsJson);
    if (poErr) {
      setSaveError(poErr);
      return;
    }
    const browseErr = validateBrowseFields(
      form.browseMainCategory,
      form.browseSubCategory,
    );
    if (browseErr) {
      setSaveError(browseErr);
      return;
    }
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
      clearAdminMediaFormDraft();
      setDraftSavedAt(null);
      setModalOpen(false);
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "저장 요청을 처리하지 못했습니다.",
      );
    } finally {
      setSaveLoading(false);
    }
  }, [editing, form, loadMedias, medias]);

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
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
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

  const toggleInstantBooking = useCallback(async (m: AdminMediaDto) => {
    listFetchGenRef.current += 1;
    const next = !m.instantBookingEnabled;
    try {
      const result = await adminFetchJson(`/api/admin/medias/${m.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instantBookingEnabled: next }),
      });
      if (!result.ok) {
        setListError(result.message);
        return;
      }
      const data = result.data as { media?: unknown };
      const row = data.media ? normalizeAdminMediaRow(data.media) : null;
      if (row) {
        setMedias((prev) => prev.map((x) => (x.id === m.id ? row : x)));
        setListError(null);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const changeAvailability = useCallback(
    async (m: AdminMediaDto, next: MediaAvailability) => {
      if (m.availability === next) return;
      listFetchGenRef.current += 1;
      try {
        const result = await adminFetchJson(`/api/admin/medias/${m.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ availability: next }),
        });
        if (!result.ok) {
          setListError(result.message);
          return;
        }
        const data = result.data as { media?: unknown };
        const row = data.media ? normalizeAdminMediaRow(data.media) : null;
        if (row) {
          setMedias((prev) => prev.map((x) => (x.id === m.id ? row : x)));
          setListError(null);
        }
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const toggleCatalogVerified = useCallback(async (m: AdminMediaDto) => {
    listFetchGenRef.current += 1;
    const next = !m.isVerified;
    try {
      const result = await adminFetchJson(`/api/admin/medias/${m.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: next }),
      });
      if (!result.ok) {
        setListError(result.message);
        return;
      }
      const data = result.data as { media?: unknown };
      const row = data.media ? normalizeAdminMediaRow(data.media) : null;
      if (row) {
        setMedias((prev) => prev.map((x) => (x.id === m.id ? row : x)));
        setListError(null);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const patchFeaturedFields = useCallback(
    async (
      m: AdminMediaDto,
      patch: {
        isFeatured?: boolean;
        featuredOrder?: number | null;
        isPopular?: boolean;
        popularOrder?: number | null;
      },
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

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const headerPageSelectRef = useRef<HTMLInputElement>(null);

  const selectedCount = selectedIds.size;
  const allPageSelected =
    paginated.length > 0 && paginated.every((m) => selectedIds.has(m.id));
  const somePageSelected = paginated.some((m) => selectedIds.has(m.id));

  useEffect(() => {
    const el = headerPageSelectRef.current;
    if (!el) return;
    el.indeterminate = somePageSelected && !allPageSelected;
  }, [somePageSelected, allPageSelected]);

  const toggleRowSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAllOnPage = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (paginated.every((m) => next.has(m.id))) {
        paginated.forEach((m) => next.delete(m.id));
      } else {
        paginated.forEach((m) => next.add(m.id));
      }
      return next;
    });
  }, [paginated]);

  const clearRowSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const patchMediaJson = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      listFetchGenRef.current += 1;
      const result = await adminFetchJson(`/api/admin/medias/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return result.ok;
    },
    [],
  );

  const runBulkForSelected = useCallback(
    async (label: string, run: (m: AdminMediaDto) => Promise<boolean>) => {
      const items = filtered.filter((m) => selectedIds.has(m.id));
      if (items.length === 0) return;
      setBulkBusy(true);
      setListError(null);
      try {
        for (const m of items) {
          const ok = await run(m);
          if (!ok) {
            setListError(`${label}: 일부 요청이 실패했습니다.`);
            await loadMedias({ showSpinner: false });
            return;
          }
        }
        await loadMedias({ showSpinner: false });
        setListError(null);
        setSelectedIds(new Set());
      } catch {
        setListError(`${label}: 처리 중 오류가 났습니다.`);
        await loadMedias({ showSpinner: false });
      } finally {
        setBulkBusy(false);
      }
    },
    [filtered, selectedIds, loadMedias],
  );

  const bulkVerifiedOn = useCallback(
    () =>
      void runBulkForSelected("Verified 표시", (m) =>
        patchMediaJson(m.id, { isVerified: true }),
      ),
    [runBulkForSelected, patchMediaJson],
  );
  const bulkVerifiedOff = useCallback(
    () =>
      void runBulkForSelected("Verified 해제", (m) =>
        patchMediaJson(m.id, { isVerified: false }),
      ),
    [runBulkForSelected, patchMediaJson],
  );
  const bulkFeaturedOn = useCallback(
    () =>
      void runBulkForSelected("홈 추천 켜기", (m) =>
        patchMediaJson(m.id, { isFeatured: true }),
      ),
    [runBulkForSelected, patchMediaJson],
  );
  const bulkFeaturedOff = useCallback(
    () =>
      void runBulkForSelected("홈 추천 끄기", (m) =>
        patchMediaJson(m.id, { isFeatured: false }),
      ),
    [runBulkForSelected, patchMediaJson],
  );
  const bulkPopularOn = useCallback(
    () =>
      void runBulkForSelected("홈 인기 켜기", (m) =>
        patchMediaJson(m.id, { isPopular: true }),
      ),
    [runBulkForSelected, patchMediaJson],
  );
  const bulkPopularOff = useCallback(
    () =>
      void runBulkForSelected("홈 인기 끄기", (m) =>
        patchMediaJson(m.id, { isPopular: false }),
      ),
    [runBulkForSelected, patchMediaJson],
  );
  const bulkActivate = useCallback(
    () =>
      void runBulkForSelected("목록 활성화", (m) =>
        patchMediaJson(m.id, { isActive: true }),
      ),
    [runBulkForSelected, patchMediaJson],
  );
  const bulkDeactivate = useCallback(
    () =>
      void runBulkForSelected("목록 비활성화", (m) =>
        patchMediaJson(m.id, { isActive: false }),
      ),
    [runBulkForSelected, patchMediaJson],
  );
  const bulkInstantBookingOn = useCallback(
    () =>
      void runBulkForSelected("즉시 예약 켜기", (m) =>
        patchMediaJson(m.id, { instantBookingEnabled: true }),
      ),
    [runBulkForSelected, patchMediaJson],
  );
  const bulkInstantBookingOff = useCallback(
    () =>
      void runBulkForSelected("즉시 예약 끄기", (m) =>
        patchMediaJson(m.id, { instantBookingEnabled: false }),
      ),
    [runBulkForSelected, patchMediaJson],
  );

  const bulkFeaturedOrderByList = useCallback(async () => {
    const ordered = filtered.filter((m) => selectedIds.has(m.id));
    if (ordered.length === 0) return;
    setBulkBusy(true);
    setListError(null);
    try {
      let n = 1;
      for (const m of ordered) {
        const ok = await patchMediaJson(m.id, {
          isFeatured: true,
          featuredOrder: n++,
        });
        if (!ok) {
          setListError("추천 순서(목록순): 일부 요청이 실패했습니다.");
          await loadMedias({ showSpinner: false });
          return;
        }
      }
      await loadMedias({ showSpinner: false });
      setListError(null);
      setSelectedIds(new Set());
    } catch {
      setListError("추천 순서(목록순): 처리 중 오류가 났습니다.");
      await loadMedias({ showSpinner: false });
    } finally {
      setBulkBusy(false);
    }
  }, [filtered, selectedIds, patchMediaJson, loadMedias]);

  const bulkPopularOrderByList = useCallback(async () => {
    const ordered = filtered.filter((m) => selectedIds.has(m.id));
    if (ordered.length === 0) return;
    setBulkBusy(true);
    setListError(null);
    try {
      let n = 1;
      for (const m of ordered) {
        const ok = await patchMediaJson(m.id, {
          isPopular: true,
          popularOrder: n++,
        });
        if (!ok) {
          setListError("인기 순서(목록순): 일부 요청이 실패했습니다.");
          await loadMedias({ showSpinner: false });
          return;
        }
      }
      await loadMedias({ showSpinner: false });
      setListError(null);
      setSelectedIds(new Set());
    } catch {
      setListError("인기 순서(목록순): 처리 중 오류가 났습니다.");
      await loadMedias({ showSpinner: false });
    } finally {
      setBulkBusy(false);
    }
  }, [filtered, selectedIds, patchMediaJson, loadMedias]);

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
      "즉시예약",
      "공개목록",
      "THINKAD검증(공개)",
      "추천(홈)",
      "추천순서",
      "인기(홈)",
      "인기순서",
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
      m.instantBookingEnabled ? "Y" : "",
      m.isActive ? "활성" : "비활성",
      m.isVerified ? "Y" : "",
      m.isFeatured ? "Y" : "",
      m.featuredOrder != null ? String(m.featuredOrder) : "",
      m.isPopular ? "Y" : "",
      m.popularOrder != null ? String(m.popularOrder) : "",
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

  const uploadFileToBunny = useCallback(async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("file", file);
    const up = await fetch("/api/admin/upload/bunny", {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const upJson = (await up.json().catch(() => ({}))) as BunnyUploadApiResponse;
    if (!up.ok || !upJson.url) {
      throw new Error(formatBunnyUploadError(up.status, upJson));
    }
    return upJson.url;
  }, []);

  const uploadGalleryFiles = useCallback(
    async (files: File[]): Promise<string[]> => {
      setFormImageUploadBusy(true);
      setSaveError(null);
      try {
        const urls: string[] = [];
        for (const file of files) {
          urls.push(await uploadFileToBunny(file));
        }
        return urls;
      } catch (e) {
        setSaveError(
          e instanceof Error
            ? `이미지 업로드 실패: ${e.message}`
            : "이미지 업로드에 실패했습니다.",
        );
        throw e;
      } finally {
        setFormImageUploadBusy(false);
      }
    },
    [uploadFileToBunny],
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
        const secureUrl = await uploadFileToBunny(item.file);
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
  }, [uploadItems, uploadFileToBunny]);

  const allMapped =
    uploadItems.length > 0 && uploadItems.every((i) => i.mediaId !== null);
  const allDone =
    uploadItems.length > 0 && uploadItems.every((i) => i.status === "done");

  const isRowActive = (m: AdminMediaDto) => m.isActive;

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-wrap gap-1">
            {[
              { value: "all", label: "전체" },
              { value: "digital", label: "디지털" },
              { value: "static", label: "고정형" },
              { value: "mobile", label: "이동형" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setTypeFilter(opt.value);
                  setPage(1);
                }}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                  typeFilter === opt.value
                    ? "border-2 border-border bg-foreground text-background"
                    : "border-2 border-border bg-card text-foreground hover:bg-muted/50"
                }`}
              >
                {opt.label}
              </button>
            ))}
            {/* 네트워크 매체는 별도 테이블(MediaNetwork)이므로 이 목록(Media)에서 필터하지 않고
                전용 관리 화면으로 이동시킨다. */}
            <Link
              href="/admin/networks"
              className="inline-flex items-center gap-1 rounded-full border-2 border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted/50"
            >
              네트워크
              <ChevronRight className="h-3 w-3" aria-hidden />
            </Link>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-1.5 sm:w-auto sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <div className="relative w-full min-w-0 sm:w-52 sm:flex-none">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="매체명 검색..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-full pl-8 text-sm"
              />
            </div>
            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value as MediaSortOrder);
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs font-semibold sm:w-auto"
              aria-label="정렬"
            >
              <option value="updated">최근 수정순</option>
              <option value="popular">인기 매체순</option>
              <option value="views">조회수순</option>
              <option value="favorites">찜순</option>
              <option value="inquiries">문의순</option>
            </select>
            <div className="grid w-full grid-cols-2 gap-1.5 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setUploadItems([]);
                setUploadModalOpen(true);
              }}
              className="w-full justify-center sm:w-auto"
            >
              <ImagePlus className="h-4 w-4" />
              <span className="hidden sm:inline">사진 업로드</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              className="w-full justify-center sm:w-auto"
              disabled={medias.length === 0}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">엑셀 다운로드</span>
            </Button>
            <Button variant="outline" className="w-full justify-center sm:w-auto" asChild>
              <Link
                href="/admin/medias/quick-add"
                className="inline-flex items-center justify-center gap-2"
              >
                <Code2 className="h-4 w-4" />
                <span className="hidden sm:inline">JSON 간편 등록</span>
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-center sm:w-auto" asChild>
              <Link
                href="/admin/medias/import"
                className="inline-flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden sm:inline">CSV 등록</span>
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-center sm:w-auto" asChild>
              <Link
                href="/admin/medias/bulk-import"
                className="inline-flex items-center justify-center gap-2"
              >
                <Layers className="h-4 w-4" />
                <span className="hidden sm:inline">JSON 일괄</span>
              </Link>
            </Button>
            <Button
              onClick={() => openAdd()}
              className="col-span-2 w-full justify-center border-2 border-border bg-primary text-primary-foreground transition-colors hover:bg-foreground hover:border-border sm:col-span-1 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">매체 추가</span>
            </Button>
            </div>
          </div>
        </div>

        <AdminMediaQualityToolbar
          lowQualityCount={lowQualityCount}
          qualityFilter={qualityFilter}
          onQualityFilterChange={(v) => {
            setQualityFilter(v);
            setPage(1);
          }}
          onBatchComplete={() => void loadMedias({ showSpinner: false })}
        />

        <div className="rounded-2xl border border-border bg-muted/15 px-2 py-2 sm:px-2.5">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            노출 필터
          </p>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:gap-4">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="w-11 shrink-0 text-xs font-medium text-muted-foreground">
                공개
              </span>
              {(
                [
                  { value: "all" as const, label: "전체" },
                  { value: "public" as const, label: "공개만" },
                  { value: "hidden" as const, label: "숨김만" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setPublicFilter(opt.value);
                    setPage(1);
                  }}
                  className={`rounded-full px-2 py-1 text-[11px] font-semibold transition-colors sm:px-2.5 sm:text-xs ${
                    publicFilter === opt.value
                      ? "border-2 border-border bg-foreground text-background"
                      : "border-2 border-border bg-card text-foreground hover:bg-muted/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:border-l sm:border-border sm:pl-4">
              <span className="w-11 shrink-0 text-xs font-medium text-muted-foreground">
                가용
              </span>
              {(
                [
                  { value: "all" as const, label: "전체" },
                  {
                    value: "available" as const,
                    label: ADMIN_MEDIA_AVAILABILITY_LABEL.available,
                  },
                  {
                    value: "reserved" as const,
                    label: ADMIN_MEDIA_AVAILABILITY_LABEL.reserved,
                  },
                  {
                    value: "maintenance" as const,
                    label: ADMIN_MEDIA_AVAILABILITY_LABEL.maintenance,
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setAvailabilityFilter(opt.value);
                    setPage(1);
                  }}
                  className={`rounded-full px-2 py-1 text-[11px] font-semibold transition-colors sm:px-2.5 sm:text-xs ${
                    availabilityFilter === opt.value
                      ? "border-2 border-border bg-foreground text-background"
                      : "border-2 border-border bg-card text-foreground hover:bg-muted/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {listError && (
          <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {listError}
          </div>
        )}

        {!listLoading &&
          medias.length > 0 &&
          filtered.length === 0 &&
          (typeFilter !== "all" ||
            search.trim() !== "" ||
            publicFilter !== "all" ||
            availabilityFilter !== "all") && (
            <div className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <span className="min-w-0 leading-snug">
                필터 또는 검색 때문에 표시되는 매체가 없습니다. (전체{" "}
                {medias.length}건)
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 border-amber-300 bg-white"
                onClick={() => {
                  resetListFilters();
                }}
              >
                전체 보기
              </Button>
            </div>
          )}

        <Card className="overflow-hidden shadow-sm">
          <CardContent className="p-0">
            {selectedCount > 0 && (
              <div className="flex flex-col gap-2 border-b border-border bg-muted/40 px-3 py-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
                <p className="text-xs font-medium text-foreground">
                  <span className="tabular-nums">{selectedCount}</span>
                  개 선택 · 필터 결과 순서대로 &quot;목록순&quot; 번호가 매겨집니다
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    disabled={bulkBusy}
                    className="h-7 text-[11px]"
                    onClick={() => bulkVerifiedOn()}
                  >
                    Verified 켜기
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    disabled={bulkBusy}
                    className="h-7 text-[11px]"
                    onClick={() => bulkVerifiedOff()}
                  >
                    Verified 끄기
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    disabled={bulkBusy}
                    className="h-7 text-[11px]"
                    onClick={() => bulkFeaturedOn()}
                  >
                    추천 켜기
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    disabled={bulkBusy}
                    className="h-7 text-[11px]"
                    onClick={() => bulkFeaturedOff()}
                  >
                    추천 끄기
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="xs"
                    disabled={bulkBusy}
                    className="h-7 text-[11px]"
                    onClick={() => void bulkFeaturedOrderByList()}
                  >
                    추천 순서(목록순)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    disabled={bulkBusy}
                    className="h-7 text-[11px]"
                    onClick={() => bulkPopularOn()}
                  >
                    인기 켜기
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    disabled={bulkBusy}
                    className="h-7 text-[11px]"
                    onClick={() => bulkPopularOff()}
                  >
                    인기 끄기
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="xs"
                    disabled={bulkBusy}
                    className="h-7 text-[11px]"
                    onClick={() => void bulkPopularOrderByList()}
                  >
                    인기 순서(목록순)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    disabled={bulkBusy}
                    className="h-7 text-[11px] border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                    onClick={() => bulkActivate()}
                  >
                    활성화
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    disabled={bulkBusy}
                    className="h-7 text-[11px] border-amber-500/40 text-amber-800 dark:text-amber-200"
                    onClick={() => bulkDeactivate()}
                  >
                    비활성화
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    disabled={bulkBusy}
                    className="h-7 text-[11px] border-violet-500/40 text-violet-700 dark:text-violet-300"
                    onClick={() => bulkInstantBookingOn()}
                  >
                    즉시예약 켜기
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    disabled={bulkBusy}
                    className="h-7 text-[11px] border-violet-500/40 text-violet-700 dark:text-violet-300"
                    onClick={() => bulkInstantBookingOff()}
                  >
                    즉시예약 끄기
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    disabled={bulkBusy}
                    className="h-7 text-[11px]"
                    onClick={clearRowSelection}
                  >
                    선택 해제
                  </Button>
                </div>
              </div>
            )}
            {/* #ADMIN-MEDIAS-1: 모바일 카드 — 매체명·유형·가격·노출(공개·가용·홈 추천/인기)·Verified·수정·삭제 (위치는 목록 비표시) */}
            <div className="md:hidden">
              {listLoading ? (
                <div className="px-3 py-8 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-7 w-7 animate-spin text-muted-foreground" />
                  <p className="mt-1.5 text-xs">불러오는 중…</p>
                </div>
              ) : paginated.length === 0 ? (
                <div className="px-3 py-8 text-center text-muted-foreground">
                  {medias.length === 0
                    ? "등록된 매체가 없습니다. 추가하거나 JSON 간편 등록을 이용하세요."
                    : "조건에 맞는 매체가 없습니다."}
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {paginated.map((media) => (
                    <li
                      key={media.id}
                      className={`border-l-[3px] px-3 py-3 ${
                        isRowActive(media)
                          ? "border-l-transparent"
                          : "border-l-amber-500/75 bg-muted/35 dark:border-l-amber-400/60"
                      }`}
                    >
                      <div className="flex gap-3">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-input text-primary accent-primary"
                          checked={selectedIds.has(media.id)}
                          onChange={() => toggleRowSelected(media.id)}
                          aria-label={`${media.name} 선택`}
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-1">
                              <p
                                className="break-words text-sm font-semibold leading-snug text-foreground"
                                title={media.name}
                              >
                                <span className="inline-flex flex-wrap items-center gap-1.5">
                                  {media.name}
                                  <MediaQualityScoreBadge
                                    score={mediaQualityScore(media)}
                                  />
                                </span>
                              </p>
                              {regionZoneLabel(media.regionZone, "ko") ? (
                                <p className="text-[10px] text-muted-foreground">
                                  // {regionZoneLabel(media.regionZone, "ko")}
                                  {media.district ? ` · ${media.district}` : ""}
                                </p>
                              ) : null}
                              {media.nameEn != null && media.nameEn.trim() !== "" ? (
                                <p
                                  className="break-words text-[11px] leading-snug text-muted-foreground"
                                  title={media.nameEn}
                                >
                                  {media.nameEn}
                                </p>
                              ) : null}
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                <Badge
                                  variant="secondary"
                                  className="border border-border bg-card text-[10px] font-display font-bold uppercase tracking-[0.1em] text-foreground"
                                >
                                  {typeBadgeLabel(media.type)}
                                </Badge>
                                <span className="text-xs font-semibold tabular-nums text-foreground">
                                  ₩{media.price.toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleActive(media)}
                              title={
                                isRowActive(media)
                                  ? "공개 목록·검색에서 숨기기"
                                  : "공개 목록·검색에 표시"
                              }
                              aria-label={
                                isRowActive(media)
                                  ? "공개 목록 끄기"
                                  : "공개 목록 켜기"
                              }
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                                isRowActive(media)
                                  ? "bg-emerald-500"
                                  : "bg-slate-300"
                              }`}
                            >
                              <span
                                className={`mt-0.5 inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                                  isRowActive(media)
                                    ? "translate-x-[18px]"
                                    : "translate-x-0.5"
                                }`}
                              />
                            </button>
                          </div>

                          <div
                            className="rounded-md border border-border/70 bg-muted/15 p-2.5"
                            title="홈 추천·인기 순서는 PC 목록에서 설정"
                          >
                            <div className="flex flex-wrap items-end gap-2">
                              <label className="min-w-0 flex-1">
                                <span className="mb-0.5 block text-[10px] font-medium text-muted-foreground">
                                  가용
                                </span>
                                <select
                                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                                  value={media.availability}
                                  aria-label="가용 상태"
                                  onChange={(e) => {
                                    const v = e.target
                                      .value as MediaAvailability;
                                    void changeAvailability(media, v);
                                  }}
                                >
                                  {(
                                    [
                                      "available",
                                      "reserved",
                                      "maintenance",
                                    ] as const
                                  ).map((key) => (
                                    <option key={key} value={key}>
                                      {ADMIN_MEDIA_AVAILABILITY_LABEL[key]}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <div className="flex shrink-0 flex-col items-center gap-1">
                                <span className="mb-0.5 block text-[10px] font-medium text-muted-foreground">
                                  즉시예약
                                </span>
                                <button
                                  type="button"
                                  title={
                                    media.instantBookingEnabled
                                      ? "즉시 예약 끄기"
                                      : "즉시 예약 켜기"
                                  }
                                  onClick={() => void toggleInstantBooking(media)}
                                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                                    media.instantBookingEnabled
                                      ? "bg-violet-500"
                                      : "bg-slate-300"
                                  }`}
                                >
                                  <span
                                    className={`mt-0.5 inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                                      media.instantBookingEnabled
                                        ? "translate-x-[18px]"
                                        : "translate-x-0.5"
                                    }`}
                                  />
                                </button>
                              </div>
                              <div className="shrink-0">
                                <span className="mb-0.5 block text-[10px] font-medium text-muted-foreground">
                                  홈
                                </span>
                                <div className="flex gap-1">
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
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card transition-colors hover:bg-amber-50"
                                  >
                                    <Star
                                      className={`h-3.5 w-3.5 ${
                                        media.isFeatured
                                          ? "fill-amber-400 text-amber-500"
                                          : "text-slate-300"
                                      }`}
                                      aria-hidden
                                    />
                                  </button>
                                  <button
                                    type="button"
                                    title={
                                      media.isPopular
                                        ? "인기 해제"
                                        : "홈 인기 매체로 지정"
                                    }
                                    onClick={() =>
                                      void patchFeaturedFields(media, {
                                        isPopular: !media.isPopular,
                                      })
                                    }
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card transition-colors hover:bg-rose-50"
                                  >
                                    <Flame
                                      className={`h-3.5 w-3.5 ${
                                        media.isPopular
                                          ? "fill-rose-400 text-rose-500"
                                          : "text-slate-300"
                                      }`}
                                      aria-hidden
                                    />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <button
                                type="button"
                                title={
                                  media.isVerified
                                    ? "공개 Verified 해제"
                                    : "공개 카탈로그에 Verified 표시"
                                }
                                onClick={() =>
                                  void toggleCatalogVerified(media)
                                }
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-orange-50"
                              >
                                <ShieldCheck
                                  className={`h-3.5 w-3.5 ${
                                    media.isVerified
                                      ? "text-[#ff6200]"
                                      : "text-slate-300"
                                  }`}
                                  aria-hidden
                                />
                              </button>
                              <span className="text-[11px] text-muted-foreground">
                                Verified
                              </span>
                            </div>
                            <div className="flex shrink-0 gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="h-8 min-w-0 justify-center px-3"
                              >
                                <Link
                                  href={`/admin/medias/${media.id}/edit`}
                                  className="inline-flex min-w-0 items-center justify-center gap-1.5"
                                >
                                  <Pencil className="h-3.5 w-3.5 shrink-0" />
                                  <span>수정</span>
                                </Link>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 shrink-0 px-2"
                                title="복제"
                                disabled={duplicateBusyId === media.id}
                                onClick={() => void duplicateMedia(media)}
                              >
                                {duplicateBusyId === media.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 shrink-0 px-2 text-destructive hover:text-destructive"
                                onClick={() => setDeleteConfirm(media.id)}
                                aria-label="삭제"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[52rem] table-fixed text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs font-medium text-foreground/80 dark:bg-muted/20 dark:text-muted-foreground">
                    <th className="w-10 px-2 py-2.5 text-center">
                      <input
                        ref={headerPageSelectRef}
                        type="checkbox"
                        className="h-4 w-4 rounded border-input text-primary accent-primary"
                        checked={allPageSelected}
                        onChange={toggleSelectAllOnPage}
                        aria-label="현재 페이지 전체 선택"
                      />
                    </th>
                    <th className="w-[42%] min-w-[14rem] px-3 py-2.5 font-medium">
                      매체명 · 품질
                    </th>
                    <th className="w-[5.5rem] px-2 py-2.5">유형</th>
                    <th className="w-28 px-2 py-2.5">가격</th>
                    <th className="w-12 px-1 py-2.5 text-center">조회</th>
                    <th className="w-12 px-1 py-2.5 text-center">찜</th>
                    <th className="w-12 px-1 py-2.5 text-center">문의</th>
                    <th className="w-56 px-2 py-2.5 text-center">노출</th>
                    <th className="w-11 px-1.5 py-2.5 text-center">검증</th>
                    <th className="w-11 px-1.5 py-2.5 text-center">추천</th>
                    <th className="w-14 px-1.5 py-2.5 text-center">순서</th>
                    <th className="w-11 px-1.5 py-2.5 text-center">인기</th>
                    <th className="w-14 px-1.5 py-2.5 text-center">순서</th>
                    <th className="w-[7.5rem] px-2 py-2.5 text-center">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {listLoading ? (
                    <tr>
                      <td
                        colSpan={14}
                        className="px-3 py-8 text-center text-muted-foreground"
                      >
                        <Loader2 className="mx-auto h-7 w-7 animate-spin text-muted-foreground" />
                        <p className="mt-1.5 text-xs">불러오는 중…</p>
                      </td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={14}
                        className="px-3 py-8 text-center text-muted-foreground"
                      >
                        {medias.length === 0
                          ? "등록된 매체가 없습니다. 추가하거나 JSON 간편 등록을 이용하세요."
                          : "조건에 맞는 매체가 없습니다. 상단의 「전체 보기」 또는 유형·노출 필터·검색을 확인하세요."}
                      </td>
                    </tr>
                  ) : (
                    paginated.map((media) => (
                      <tr
                        key={media.id}
                        className={`border-b last:border-0 border-l-[3px] transition-colors ${
                          isRowActive(media)
                            ? "border-l-transparent hover:bg-muted/40"
                            : "border-l-amber-500/75 bg-muted/25 hover:bg-muted/40 dark:border-l-amber-400/60"
                        }`}
                      >
                        <td className="px-2 py-2.5 align-middle text-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-input text-primary accent-primary"
                            checked={selectedIds.has(media.id)}
                            onChange={() => toggleRowSelected(media.id)}
                            aria-label={`${media.name} 선택`}
                          />
                        </td>
                        <td className="min-w-0 px-3 py-2.5 align-middle">
                          <div className="flex flex-wrap items-center gap-1.5 break-words text-sm font-medium leading-snug text-foreground">
                            {media.name}
                            <MediaQualityScoreBadge score={mediaQualityScore(media)} />
                          </div>
                          <div className="mt-1 break-words text-xs leading-snug text-muted-foreground">
                            {media.nameEn != null && media.nameEn !== ""
                              ? media.nameEn
                              : "—"}
                            {regionZoneLabel(media.regionZone, "ko")
                              ? ` · ${regionZoneLabel(media.regionZone, "ko")}`
                              : ""}
                            {media.district ? ` · ${media.district}` : ""}
                          </div>
                        </td>
                        <td className="px-2 py-2.5 align-middle">
                          <Badge
                            variant="secondary"
                            className="max-w-full truncate border border-border bg-card px-2 py-0.5 text-[11px] font-display font-bold uppercase tracking-[0.06em] text-foreground"
                            title={typeBadgeLabel(media.type)}
                          >
                            {typeBadgeLabel(media.type)}
                          </Badge>
                        </td>
                        <td className="px-2 py-2.5 align-middle font-semibold text-foreground">
                          <div
                            className="truncate text-sm tabular-nums"
                            title={`₩${media.price.toLocaleString()}`}
                          >
                            ₩{media.price.toLocaleString()}
                          </div>
                        </td>
                        {(["viewCount", "favoriteCount", "inquiryCount"] as const).map(
                          (key) => (
                            <td
                              key={key}
                              className="px-1 py-2.5 text-center align-middle  tabular-nums text-muted-foreground"
                            >
                              {engagement[media.id]?.[key] ?? 0}
                            </td>
                          ),
                        )}
                        <td className="px-2 py-2.5 align-middle">
                          <div className="mx-auto flex min-w-0 items-center justify-center gap-3">
                            <div className="flex shrink-0 flex-col items-center gap-1">
                              <span className="text-[10px] font-medium text-muted-foreground">
                                공개
                              </span>
                              <button
                                type="button"
                                title={
                                  isRowActive(media)
                                    ? "공개 목록·검색에서 숨기기"
                                    : "공개 목록·검색에 표시"
                                }
                                onClick={() => toggleActive(media)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                                  isRowActive(media)
                                    ? "bg-emerald-500"
                                    : "bg-slate-300"
                                }`}
                              >
                                <span
                                  className={`mt-0.5 inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                                    isRowActive(media)
                                      ? "translate-x-[18px]"
                                      : "translate-x-0.5"
                                  }`}
                                />
                              </button>
                            </div>
                            <label className="min-w-0 flex-1">
                              <span className="mb-1 block text-center text-[10px] font-medium text-muted-foreground">
                                가용
                              </span>
                              <select
                                className="flex h-8 w-full min-w-[5.5rem] rounded-md border border-input bg-background px-2 text-xs"
                                value={media.availability}
                                aria-label="가용 상태"
                                onChange={(e) => {
                                  const v = e.target
                                    .value as MediaAvailability;
                                  void changeAvailability(media, v);
                                }}
                              >
                                {(
                                  [
                                    "available",
                                    "reserved",
                                    "maintenance",
                                  ] as const
                                ).map((key) => (
                                  <option key={key} value={key}>
                                    {ADMIN_MEDIA_AVAILABILITY_LABEL[key]}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <div className="flex shrink-0 flex-col items-center gap-1">
                              <span className="text-[10px] font-medium text-muted-foreground">
                                즉시예약
                              </span>
                              <button
                                type="button"
                                title={
                                  media.instantBookingEnabled
                                    ? "즉시 예약 끄기"
                                    : "즉시 예약 켜기 (가용=예약가능 필요)"
                                }
                                aria-label={
                                  media.instantBookingEnabled
                                    ? "즉시 예약 끄기"
                                    : "즉시 예약 켜기"
                                }
                                onClick={() => void toggleInstantBooking(media)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                                  media.instantBookingEnabled
                                    ? "bg-violet-500"
                                    : "bg-slate-300"
                                }`}
                              >
                                <span
                                  className={`mt-0.5 inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                                    media.instantBookingEnabled
                                      ? "translate-x-[18px]"
                                      : "translate-x-0.5"
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-1.5 py-2.5 text-center align-middle">
                          <button
                            type="button"
                            title={
                              media.isVerified
                                ? "공개 Verified 해제"
                                : "공개 카탈로그에 Verified 표시"
                            }
                            onClick={() => void toggleCatalogVerified(media)}
                            className="inline-flex touch-manipulation rounded-full p-1 transition-colors hover:bg-orange-50"
                          >
                            <ShieldCheck
                              className={`h-[18px] w-[18px] ${
                                media.isVerified
                                  ? "text-[#ff6200]"
                                  : "text-slate-300"
                              }`}
                              aria-hidden
                            />
                          </button>
                        </td>
                        <td className="px-1.5 py-2.5 text-center align-middle">
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
                            className="inline-flex touch-manipulation rounded-full p-1 transition-colors hover:bg-amber-50"
                          >
                            <Star
                              className={`h-[18px] w-[18px] ${
                                media.isFeatured
                                  ? "fill-amber-400 text-amber-500"
                                  : "text-slate-300"
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-1.5 py-2.5 text-center align-middle">
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
                            className="mx-auto h-8 w-12 px-1 text-center text-xs disabled:opacity-40"
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
                        <td className="px-1.5 py-2.5 text-center align-middle">
                          <button
                            type="button"
                            title={
                              media.isPopular
                                ? "인기 해제"
                                : "홈 인기 매체로 지정"
                            }
                            onClick={() =>
                              void patchFeaturedFields(media, {
                                isPopular: !media.isPopular,
                              })
                            }
                            className="inline-flex touch-manipulation rounded-full p-1 transition-colors hover:bg-rose-50"
                          >
                            <Flame
                              className={`h-[18px] w-[18px] ${
                                media.isPopular
                                  ? "fill-rose-400 text-rose-500"
                                  : "text-slate-300"
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-1.5 py-2.5 text-center align-middle">
                          <Input
                            key={`po-${media.id}-${media.popularOrder ?? "n"}`}
                            type="number"
                            min={1}
                            max={99}
                            placeholder="—"
                            disabled={!media.isPopular}
                            defaultValue={
                              media.popularOrder != null
                                ? String(media.popularOrder)
                                : ""
                            }
                            className="mx-auto h-8 w-12 px-1 text-center text-xs disabled:opacity-40"
                            onBlur={(e) => {
                              if (!media.isPopular) return;
                              const raw = e.target.value.trim();
                              if (!raw) {
                                void patchFeaturedFields(media, {
                                  popularOrder: null,
                                });
                                return;
                              }
                              const n = parseInt(raw, 10);
                              if (!Number.isFinite(n)) return;
                              void patchFeaturedFields(media, {
                                popularOrder: n,
                              });
                            }}
                          />
                        </td>
                        <td className="px-2 py-2.5 align-middle">
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            <Button
                              variant="outline"
                              size="xs"
                              asChild
                              className="h-8 px-2 text-xs"
                            >
                              <Link
                                href={`/admin/medias/${media.id}/edit`}
                                title="JSON 수정"
                              >
                                JSON 수정
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              title="복제"
                              disabled={duplicateBusyId === media.id}
                              onClick={() => void duplicateMedia(media)}
                            >
                              {duplicateBusyId === media.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
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

            {!listLoading && filtered.length > 0 && (
              <div className="flex flex-col gap-2 border-t px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:px-4">
                <span className="min-w-0 text-center text-xs leading-snug text-muted-foreground sm:flex-1 sm:text-left">
                  총 {filtered.length}건 중 {(page - 1) * pageSize + 1}–
                  {Math.min(page * pageSize, filtered.length)}
                </span>
                <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-end">
                  <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="shrink-0">페이지당</span>
                    <select
                      className="h-8 min-w-[4.5rem] rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground"
                      value={pageSize}
                      aria-label="페이지당 매체 수"
                      onChange={(e) =>
                        onPageSizeChange(Number.parseInt(e.target.value, 10))
                      }
                    >
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n}개
                        </option>
                      ))}
                    </select>
                  </label>
                  {totalPages > 1 && (
                    <div className="flex shrink-0 justify-center gap-1">
                      <Button
                        variant="outline"
                        size="icon-xs"
                        disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}
                        aria-label="이전 페이지"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <span className="flex items-center px-1 text-[11px] text-muted-foreground">
                        {page}/{totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="icon-xs"
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        aria-label="다음 페이지"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex min-h-0 items-end justify-center p-0 sm:items-center sm:p-4">
          <div
            className="absolute inset-0 dark:bg-zinc-900 bg-gray-50/30 dark:bg-black bg-white dark:bg-white/6 bg-gray-500 dark:backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
            aria-hidden
          />
          <Card className="relative z-10 flex max-h-[min(92dvh,900px)] w-full max-w-3xl flex-col gap-0 overflow-hidden rounded-t-2xl border-border bg-card py-0 text-card-foreground shadow-2xl ring-1 ring-black/[0.05] hover:translate-y-0 hover:shadow-2xl motion-safe:hover:translate-y-0 sm:rounded-2xl dark:border-white/12 border-gray-200 dark:bg-zinc-950 dark:text-zinc-50 dark:ring-white/10 dark:hover:shadow-[0_28px_80px_rgba(0,0,0,0.55)]">
            <CardHeader className="flex shrink-0 flex-row items-start justify-between gap-2 border-b border-border/70 px-4 pb-3 pt-4 sm:px-6">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg text-foreground">
                  {editing ? "매체 수정" : "매체 추가"}
                </CardTitle>
                {!editing ? (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {draftSavedAt
                      ? `임시저장 ${new Date(draftSavedAt).toLocaleTimeString("ko-KR")} · 30초마다 자동 저장`
                      : "필수(*) 항목만 채워도 저장 가능 · 주소 입력 시 좌표 자동 변환"}
                  </p>
                ) : null}
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 pb-2 pr-3 sm:px-6 sm:pr-5">
              {saveError && (
                <p className="text-sm text-red-600">{saveError}</p>
              )}
              <p className="rounded-md border border-cyan-500/30 bg-cyan-500/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-cyan-800 dark:text-cyan-200">
                필수 정보
              </p>
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
                <Input
                  value={form.location}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, location: e.target.value }))
                  }
                  placeholder="경기도 가평군 설악면 미사리로540번길 51"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  카탈로그·검색에 쓰는 대표 주소입니다. 실제 설치 좌표는 아래
                  「설치 지점」에서 방향별로 넣습니다.
                </p>
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground">
                    설치 지점 (방향별 좌표)
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    className="h-7 gap-1 text-[11px]"
                    onClick={() => {
                      const row = newInstallRow();
                      setForm((f) => ({
                        ...f,
                        installLocations: [...f.installLocations, row],
                      }));
                      setActiveInstallKey(row.key);
                    }}
                  >
                    <Plus className="h-3 w-3" />
                    지점 추가
                  </Button>
                </div>
                <ul className="space-y-3">
                  {form.installLocations.map((row, idx) => {
                    const isActive = row.key === activeInstallKey;
                    return (
                      <li
                        key={row.key}
                        className={`rounded-lg border p-3 ${
                          isActive
                            ? "border-primary/50 bg-card ring-1 ring-primary/20"
                            : "border-border bg-card/80"
                        }`}
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            className="text-left text-[11px] font-medium text-foreground"
                            onClick={() => setActiveInstallKey(row.key)}
                          >
                            지점 {idx + 1}
                            {isActive ? (
                              <span className="ml-1.5 text-primary">· 선택됨</span>
                            ) : null}
                          </button>
                          {form.installLocations.length > 1 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              className="h-6 text-[10px] text-red-600"
                              onClick={() => {
                                setForm((f) => {
                                  const next = f.installLocations.filter(
                                    (r) => r.key !== row.key,
                                  );
                                  const rows =
                                    next.length > 0 ? next : [newInstallRow()];
                                  return {
                                    ...f,
                                    installLocations: rows,
                                    ...syncLegacyLatLngFromRows(rows),
                                  };
                                });
                                if (activeInstallKey === row.key) {
                                  setActiveInstallKey(
                                    form.installLocations.find(
                                      (r) => r.key !== row.key,
                                    )?.key ?? null,
                                  );
                                }
                              }}
                            >
                              삭제
                            </Button>
                          ) : null}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <label className="mb-1 block text-[10px] text-muted-foreground">
                              방향·라벨 (예: 춘천방향, 서울방향)
                            </label>
                            <Input
                              className="h-8 text-sm"
                              value={row.label}
                              onFocus={() => setActiveInstallKey(row.key)}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  installLocations: f.installLocations.map((r) =>
                                    r.key === row.key
                                      ? { ...r, label: e.target.value }
                                      : r,
                                  ),
                                }))
                              }
                              placeholder="춘천방향"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="mb-1 block text-[10px] text-muted-foreground">
                              지점 주소 (선택)
                            </label>
                            <div className="flex gap-2">
                              <Input
                                className="h-8 flex-1 text-sm"
                                value={row.location}
                                onFocus={() => setActiveInstallKey(row.key)}
                                onChange={(e) =>
                                  setForm((f) => ({
                                    ...f,
                                    installLocations: f.installLocations.map(
                                      (r) =>
                                        r.key === row.key
                                          ? { ...r, location: e.target.value }
                                          : r,
                                    ),
                                  }))
                                }
                                placeholder={form.location || "주소"}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                className="h-8 shrink-0 text-[10px]"
                                disabled={
                                  geoLookupLoading ||
                                  !(row.location.trim() || form.location.trim())
                                }
                                onClick={() => {
                                  setActiveInstallKey(row.key);
                                  const q = row.location.trim() || form.location.trim();
                                  if (!q) return;
                                  setGeoLookupError(null);
                                  setGeoLookupLoading(true);
                                  void fetch("/api/admin/geo/lookup", {
                                    method: "POST",
                                    credentials: "include",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ query: q }),
                                  })
                                    .then(async (res) => {
                                      const data = (await res.json()) as {
                                        error?: string;
                                        latitude?: number;
                                        longitude?: number;
                                        city?: string;
                                        district?: string;
                                      };
                                      if (
                                        !res.ok ||
                                        data.latitude == null ||
                                        data.longitude == null
                                      ) {
                                        setGeoLookupError(
                                          data.error ?? "주소를 찾지 못했습니다.",
                                        );
                                        return;
                                      }
                                      setForm((f) => {
                                        const nextRows = f.installLocations.map(
                                          (r) =>
                                            r.key === row.key
                                              ? {
                                                  ...r,
                                                  latitude: String(data.latitude),
                                                  longitude: String(data.longitude),
                                                  location: q,
                                                }
                                              : r,
                                        );
                                        return {
                                          ...f,
                                          installLocations: nextRows,
                                          ...syncLegacyLatLngFromRows(nextRows),
                                          city: data.city ?? f.city,
                                          district: data.district ?? f.district,
                                        };
                                      });
                                    })
                                    .catch(() =>
                                      setGeoLookupError("주소 검색 요청 실패"),
                                    )
                                    .finally(() => setGeoLookupLoading(false));
                                }}
                              >
                                좌표
                              </Button>
                            </div>
                          </div>
                          <div>
                            <label className="mb-1 block text-[10px] text-muted-foreground">
                              위도
                            </label>
                            <Input
                              className="h-8 text-sm"
                              inputMode="decimal"
                              value={row.latitude}
                              onFocus={() => setActiveInstallKey(row.key)}
                              onChange={(e) =>
                                setForm((f) => {
                                  const nextRows = f.installLocations.map((r) =>
                                    r.key === row.key
                                      ? { ...r, latitude: e.target.value }
                                      : r,
                                  );
                                  return {
                                    ...f,
                                    installLocations: nextRows,
                                    ...syncLegacyLatLngFromRows(nextRows),
                                  };
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[10px] text-muted-foreground">
                              경도
                            </label>
                            <Input
                              className="h-8 text-sm"
                              inputMode="decimal"
                              value={row.longitude}
                              onFocus={() => setActiveInstallKey(row.key)}
                              onChange={(e) =>
                                setForm((f) => {
                                  const nextRows = f.installLocations.map((r) =>
                                    r.key === row.key
                                      ? { ...r, longitude: e.target.value }
                                      : r,
                                  );
                                  return {
                                    ...f,
                                    installLocations: nextRows,
                                    ...syncLegacyLatLngFromRows(nextRows),
                                  };
                                })
                              }
                            />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {geoLookupError ? (
                  <p className="text-xs text-amber-700">{geoLookupError}</p>
                ) : null}
                <p className="text-[10px] text-muted-foreground">
                  휴게소처럼 상·하행이 나뉘면 「지점 추가」로 춘천방향·서울방향을
                  각각 넣으세요. 지도에 핀이 모두 표시됩니다.
                </p>
              </div>

              {installMapPoints.length > 0 ? (
                <AdminMediaInstallLocationsMap
                  points={installMapPoints}
                  activePointId={activeInstallKey}
                  onActivePointChange={setActiveInstallKey}
                  onPointPositionChange={onInstallPointMove}
                  heightPx={300}
                />
              ) : (
                <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                  설치 지점에 위·경도를 입력하면 지도에 핀이 표시됩니다.
                </p>
              )}

              <div className="rounded-2xl border-2 border-border bg-muted p-3 bg-muted/60">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  주변 정보 미리보기
                </div>
                {nearbyPreviewLoading ? (
                  <p className="text-xs text-muted-foreground">불러오는 중…</p>
                ) : nearbyPreview ? (
                  <div className="space-y-2 text-xs">
                    {nearbyPreview.nearestSubway && (
                      <p>
                        <span className="font-medium text-foreground">인근 지하철: </span>
                        {nearbyPreview.nearestSubway.name}
                        <span className="text-muted-foreground">
                          {" "}
                          (약 {Math.round(nearbyPreview.nearestSubway.distanceM)}m)
                        </span>
                      </p>
                    )}
                    <p>
                      <span className="font-medium text-foreground">주변 시설 요약: </span>
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
                    주소를 입력하거나 지도에서 핀을 놓으면 표시됩니다.
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
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={form.isVerified}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isVerified: e.target.checked }))
                  }
                />
                공개 카탈로그 Verified 리본 (isVerified)
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
                    onChange={(e) => {
                      const next = e.target.value;
                      setForm((f) => ({
                        ...f,
                        type: next,
                        coverageDistrictCodes:
                          next.trim() === "mobile" ? f.coverageDistrictCodes : [],
                      }));
                    }}
                    placeholder="digital, static, mobile"
                  />
                </div>
              </div>

              {form.type.trim() === "mobile" ? (
                <div className="rounded-2xl border border-border bg-muted/40 p-3">
                  <p className="mb-2 text-xs font-semibold text-foreground">
                    이동형 — 서비스 구역 (전국 시·군·구)
                  </p>
                  <p className="mb-3 text-[10px] text-muted-foreground">
                    행정구역 5자리 코드 기준 근사 영역이 지도에 겹쳐 보입니다. 실제 경계와 다를 수
                    있습니다.
                  </p>
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <label className="flex min-w-0 flex-1 flex-col gap-1 text-[10px]">
                      <span className="font-medium text-muted-foreground">시·도</span>
                      <select
                        className="h-9 rounded-md border border-input bg-background px-2 text-[11px] shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={coverageSidoFilter}
                        onChange={(e) => setCoverageSidoFilter(e.target.value)}
                      >
                        {KOREA_SIDO_ORDERED.map((sido) => (
                          <option key={sido} value={sido}>
                            {sido}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex min-w-0 flex-1 flex-col gap-1 text-[10px]">
                      <span className="font-medium text-muted-foreground">검색 (이름·코드)</span>
                      <Input
                        value={coverageSigunguSearch}
                        onChange={(e) => setCoverageSigunguSearch(e.target.value)}
                        placeholder="예: 강남, 진주, 26110"
                        className="h-9 text-xs"
                      />
                    </label>
                  </div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {coverageSidoFilter} 선택 {coverageRowsSelectedCount}/{coverageRowsForPicker.length}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[10px]"
                      disabled={!coverageRowsForPicker.length || coverageRowsAllSelected}
                      onClick={() => {
                        setForm((f) => {
                          const next = new Set(f.coverageDistrictCodes);
                          for (const row of coverageRowsForPicker) next.add(row.code);
                          return {
                            ...f,
                            coverageDistrictCodes: [...next].sort(),
                          };
                        });
                      }}
                    >
                      {coverageSidoShortLabel} 전체 선택
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[10px]"
                      disabled={!coverageRowsSelectedCount}
                      onClick={() => {
                        setForm((f) => {
                          const remove = new Set(coverageRowsForPicker.map((row) => row.code));
                          return {
                            ...f,
                            coverageDistrictCodes: f.coverageDistrictCodes.filter(
                              (code) => !remove.has(code),
                            ),
                          };
                        });
                      }}
                    >
                      {coverageSidoShortLabel} 전체 해제
                    </Button>
                  </div>
                  <div className="mb-3 max-h-44 overflow-y-auto rounded-md border border-border/60 bg-card/80 p-2">
                    {coverageSigunguSearch.trim().length >= 1 &&
                    !coverageSearchHits.length ? (
                      <p className="py-2 text-center text-[11px] text-muted-foreground">
                        검색 결과가 없습니다.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                        {(coverageSigunguSearch.trim().length >= 1
                          ? coverageSearchHits
                          : coverageRowsForPicker
                        ).map((g) => (
                          <label
                            key={g.code}
                            className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-[11px] hover:bg-muted/80"
                          >
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 shrink-0 rounded border-border"
                              checked={form.coverageDistrictCodes.includes(g.code)}
                              onChange={(e) => {
                                const on = e.target.checked;
                                setForm((f) => {
                                  const set = new Set(f.coverageDistrictCodes);
                                  if (on) set.add(g.code);
                                  else set.delete(g.code);
                                  return {
                                    ...f,
                                    coverageDistrictCodes: [...set].sort(),
                                  };
                                });
                              }}
                            />
                            <span className="min-w-0 truncate" title={`${g.nameKo} (${g.code})`}>
                              {g.nameKo}
                              <span className="text-muted-foreground"> · {g.code}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={!form.coverageDistrictCodes.length}
                    onClick={() => {
                      const c = centroidOfCoverageCodes(form.coverageDistrictCodes);
                      if (!c) return;
                      setForm((f) => ({
                        ...f,
                        latitude: c.lat.toFixed(6),
                        longitude: c.lng.toFixed(6),
                        city:
                          f.city.trim() ||
                          inferShortRegionLabelFromCodes(form.coverageDistrictCodes),
                      }));
                    }}
                  >
                    선택 구 중심으로 위도·경도 맞춤
                  </Button>
                </div>
              ) : null}

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
                  placeholder="700000"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  원 단위로 입력 (예: 70만원 → 700000)
                </p>
              </div>
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                선택 정보
              </p>
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
              <AdminMediaCategoryFields
                browseMain={form.browseMainCategory}
                browseSub={form.browseSubCategory}
                regionMain={form.browseRegionMain}
                regionSub={form.browseRegionSub}
                onBrowseMainChange={(slug) =>
                  setForm((f) => ({
                    ...f,
                    browseMainCategory: slug,
                    browseSubCategory: "",
                  }))
                }
                onBrowseSubChange={(slug) =>
                  setForm((f) => ({ ...f, browseSubCategory: slug }))
                }
                onRegionMainChange={(slug) =>
                  setForm((f) => ({
                    ...f,
                    browseRegionMain: slug,
                    browseRegionSub: "",
                  }))
                }
                onRegionSubChange={(slug) =>
                  setForm((f) => ({ ...f, browseRegionSub: slug }))
                }
                parentSlug={form.mediaCategoryParent}
                subSlugs={form.mediaCategorySubs}
                targetSlugs={form.targetCategories}
                onParentChange={(slug) =>
                  setForm((f) => ({
                    ...f,
                    mediaCategoryParent: slug,
                    mediaCategorySubs: [],
                  }))
                }
                onToggleSub={(slug) =>
                  setForm((f) => ({
                    ...f,
                    mediaCategorySubs: f.mediaCategorySubs.includes(slug)
                      ? f.mediaCategorySubs.filter((s) => s !== slug)
                      : [...f.mediaCategorySubs, slug],
                  }))
                }
                onToggleTarget={(slug) =>
                  setForm((f) => ({
                    ...f,
                    targetCategories: f.targetCategories.includes(slug)
                      ? f.targetCategories.filter((s) => s !== slug)
                      : [...f.targetCategories, slug],
                  }))
                }
              />
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
              <div className="rounded-xl border-2 border-border bg-muted p-4 bg-muted/60">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-foreground">
                    가격 옵션
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={() =>
                        applyPriceOptDrafts([
                          ...priceOptDrafts,
                          newPriceOptDraft(),
                        ])
                      }
                    >
                      <Plus className="h-3.5 w-3.5" />
                      옵션 추가
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() =>
                        setPriceOptDrafts(
                          priceOptDraftsFromJson(form.priceOptionsJson),
                        )
                      }
                    >
                      JSON → 카드
                    </Button>
                  </div>
                </div>
                <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
                  카드로 편집하면 아래 JSON이 함께 갱신됩니다. 직접 JSON을
                  수정한 뒤에는「JSON → 카드」로 불러오세요. 금액은 원(KRW)
                  단위로 입력합니다 (예: 70만원 → 700000).
                </p>
                <div className="space-y-3">
                  {priceOptDrafts.length === 0 ? (
                    <p className="rounded-lg border-2 border-dashed border-border bg-card px-3 py-6 text-center text-xs text-muted-foreground">
                      옵션이 없습니다.「옵션 추가」또는 JSON을 입력하세요.
                    </p>
                  ) : (
                    priceOptDrafts.map((row, idx) => (
                      <div
                        key={row.key}
                        className="space-y-2 rounded-2xl border-2 border-border bg-card p-3 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-muted-foreground">
                            옵션 {idx + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => {
                              const next = priceOptDrafts.filter(
                                (r) => r.key !== row.key,
                              );
                              applyPriceOptDrafts(next);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            삭제
                          </Button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <label className="mb-0.5 block text-[10px] font-medium text-muted-foreground">
                              라벨 (예: 20초 / 2주 패키지)
                            </label>
                            <Input
                              className="h-9 text-sm"
                              value={row.label}
                              onChange={(e) => {
                                const v = e.target.value;
                                const next = priceOptDrafts.map((r) =>
                                  r.key === row.key ? { ...r, label: v } : r,
                                );
                                applyPriceOptDrafts(next);
                              }}
                            />
                          </div>
                          <div>
                            <label className="mb-0.5 block text-[10px] font-medium text-muted-foreground">
                              금액 (숫자)
                            </label>
                            <Input
                              className="h-9 text-sm tabular-nums"
                              inputMode="numeric"
                              value={row.price}
                              onChange={(e) => {
                                const v = e.target.value;
                                const next = priceOptDrafts.map((r) =>
                                  r.key === row.key ? { ...r, price: v } : r,
                                );
                                applyPriceOptDrafts(next);
                              }}
                            />
                          </div>
                          <div>
                            <label className="mb-0.5 block text-[10px] font-medium text-muted-foreground">
                              기간
                            </label>
                            <select
                              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
                              value={row.period}
                              onChange={(e) => {
                                const v = e.target.value;
                                const next = priceOptDrafts.map((r) =>
                                  r.key === row.key ? { ...r, period: v } : r,
                                );
                                applyPriceOptDrafts(next);
                              }}
                            >
                              <option value="month">month (월)</option>
                              <option value="biweekly">biweekly (2주)</option>
                              <option value="week">week (주)</option>
                              <option value="day">day (일)</option>
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="mb-0.5 block text-[10px] font-medium text-muted-foreground">
                              설명 (선택)
                            </label>
                            <Input
                              className="h-9 text-sm"
                              value={row.description}
                              onChange={(e) => {
                                const v = e.target.value;
                                const next = priceOptDrafts.map((r) =>
                                  r.key === row.key
                                    ? { ...r, description: v }
                                    : r,
                                );
                                applyPriceOptDrafts(next);
                              }}
                              placeholder="노출 횟수·집행 조건 등"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-4">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    가격 옵션 JSON (동기화)
                  </label>
                  <textarea
                    value={form.priceOptionsJson}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        priceOptionsJson: e.target.value,
                      }))
                    }
                    rows={5}
                    spellCheck={false}
                    className="w-full rounded-md border-2 border-border bg-card px-3 py-2 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder='[{"label":"20초 기준","price":30000000,"period":"month","description":"피크 15초"}]'
                  />
                </div>
              </div>
              <MediaGalleryEditor
                urls={galleryUrlsFromForm(form)}
                onChange={(urls) =>
                  setForm((f) => ({ ...f, ...applyGalleryUrlsToForm(urls) }))
                }
                onUploadFiles={uploadGalleryFiles}
                onDeleteRemote={deleteBunnyImage}
                busy={formImageUploadBusy}
              />
              {editing ? (
                <AdminMediaProposalUpload
                  mediaId={editing.id}
                  initial={{
                    proposalUrl: editing.proposalUrl,
                    proposalFileName: editing.proposalFileName,
                    hasProposal: editing.hasProposal,
                  }}
                  onUpdated={(next) => {
                    setMedias((prev) =>
                      prev.map((m) =>
                        m.id === editing.id ? { ...m, ...next } : m,
                      ),
                    );
                    setEditing((cur) =>
                      cur && cur.id === editing.id ? { ...cur, ...next } : cur,
                    );
                  }}
                />
              ) : null}
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
              <div className="flex flex-col gap-2 border-t px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:flex-row sm:flex-wrap sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="w-full shrink-0 sm:w-auto"
                >
                  취소
                </Button>
                <Button
                  onClick={() => void handleSave()}
                  className="w-full shrink-0 border-2 border-border bg-foreground text-background transition-colors hover:bg-primary hover:border-primary hover:text-primary-foreground sm:w-auto"
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
        <div className="fixed inset-0 z-50 flex min-h-0 items-end justify-center p-0 sm:items-center sm:p-4">
          <div
            className="absolute inset-0 dark:bg-zinc-900 bg-gray-50/30 dark:bg-black bg-white dark:bg-white/6 bg-gray-500 dark:backdrop-blur-sm"
            onClick={() => setUploadModalOpen(false)}
            aria-hidden
          />
          <Card className="relative z-10 flex max-h-[min(88dvh,820px)] w-full max-w-2xl flex-col gap-0 overflow-hidden rounded-t-2xl border-border bg-card py-0 text-card-foreground shadow-2xl ring-1 ring-black/[0.05] hover:translate-y-0 hover:shadow-2xl motion-safe:hover:translate-y-0 sm:rounded-2xl dark:border-white/12 border-gray-200 dark:bg-zinc-950 dark:text-zinc-50 dark:ring-white/10 dark:hover:shadow-[0_28px_80px_rgba(0,0,0,0.55)]">
            <CardHeader className="flex shrink-0 flex-row items-start justify-between gap-2 border-b border-border/70 px-4 pb-3 pt-4 sm:px-6">
              <CardTitle className="min-w-0 flex-1 text-lg text-foreground">
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
            <CardContent className="flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto overflow-x-hidden px-4 pb-4 pr-3 sm:px-6 sm:pr-5">
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
                    ? "border-primary bg-muted"
                    : "border-slate-200 hover:border-primary hover:bg-muted"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-border bg-card">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    이미지를 드래그하거나 클릭하여 선택
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    JPG, PNG, WebP 지원 · Bunny CDN 업로드
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
                        className="flex items-center gap-3 rounded-2xl border p-3"
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
                          <p className="truncate text-sm font-medium text-foreground">
                            {item.file.name}
                          </p>
                          {item.status === "done" ? (
                            <div className="flex items-center gap-1 text-xs text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              업로드 완료
                            </div>
                          ) : item.status === "error" ? (
                            <p className="text-xs text-red-600">
                              실패 · Bunny 설정을 확인하세요
                            </p>
                          ) : item.status === "uploading" ? (
                            <div className="space-y-1">
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-primary transition-all"
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
                <div className="flex flex-col gap-2 border-t border-border/60 px-0 pt-3 sm:flex-row sm:flex-wrap sm:justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      uploadItems.forEach((i) =>
                        URL.revokeObjectURL(i.preview),
                      );
                      setUploadItems([]);
                    }}
                    className="w-full sm:w-auto"
                  >
                    초기화
                  </Button>
                  {allDone ? (
                    <Button
                      className="w-full border-2 border-border bg-foreground text-background transition-colors hover:bg-primary hover:border-primary hover:text-primary-foreground sm:w-auto"
                      onClick={() => setUploadModalOpen(false)}
                    >
                      완료
                    </Button>
                  ) : (
                    <Button
                      className="w-full border-2 border-border bg-foreground text-background transition-colors hover:bg-primary hover:border-primary hover:text-primary-foreground sm:w-auto"
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
        <div className="fixed inset-0 z-50 flex min-h-0 items-end justify-center p-0 sm:items-center sm:p-4">
          <div
            className="absolute inset-0 dark:bg-black bg-white/40 dark:bg-white/8 bg-gray-100"
            onClick={() => setDeleteConfirm(null)}
            aria-hidden
          />
          <Card className="relative z-10 mx-3 mb-[max(0.75rem,env(safe-area-inset-bottom))] w-full max-w-sm animate-fade-in-up rounded-t-2xl sm:mx-0 sm:mb-0 sm:rounded-2xl">
            <CardContent className="space-y-4 px-4 pb-6 pt-6 text-center sm:px-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="font-semibold text-foreground">매체를 삭제하시겠습니까?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  이 작업은 되돌릴 수 없습니다.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleteLoading}
                  className="w-full sm:w-auto"
                >
                  취소
                </Button>
                <Button
                  variant="destructive"
                  disabled={deleteLoading}
                  onClick={() => void handleDelete(deleteConfirm)}
                  className="w-full sm:w-auto"
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
