"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, AlertCircle, Upload } from "lucide-react";
import { MediaGalleryEditor } from "@/components/admin/media-gallery-editor";
import {
  NETWORK_TYPE_CODES,
  NETWORK_TYPE_LABELS,
} from "@/lib/media-network-types";
import { parseNetworkLocationsCsv } from "@/lib/network-locations-csv";
import {
  buildNetworkCreateBody,
  parseAndBuildNetworkCreateBodyFromObject,
} from "@/lib/network-quick-add";

export type SerializedNetwork = {
  id: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  type: string;
  pricePerUnit: number | null;
  pricePackage: number | null;
  priceNote: string | null;
  minUnits: number;
  totalLocations: number;
  regions: string[];
  city: string | null;
  district: string | null;
  image: string | null;
  galleryImages: string[];
  features: string | null;
  packageOptions: unknown;
  visibilityScore: number | null;
  dailyFootfall: number | null;
  targetAge: string | null;
  effectMemo: string | null;
  operatingHours: string | null;
  tags: string[];
  isActive: boolean;
  locations: Array<{
    name: string;
    address: string | null;
    fullAddress: string | null;
    regionMain: string | null;
    regionSub: string | null;
    unitCount: number | null;
    latitude: number | null;
    longitude: number | null;
    priceNote: string | null;
    dailyFootfall: number | null;
    note: string | null;
  }>;
};

type LocRow = {
  name: string;
  address: string;
  fullAddress: string;
  regionMain: string;
  regionSub: string;
  unitCount: string;
  lat: string;
  lng: string;
  priceNote: string;
  dailyFootfall: string;
  note: string;
};

function emptyLocRow(): LocRow {
  return {
    name: "",
    address: "",
    fullAddress: "",
    regionMain: "",
    regionSub: "",
    unitCount: "1",
    lat: "",
    lng: "",
    priceNote: "",
    dailyFootfall: "",
    note: "",
  };
}

function serializePackageOptions(raw: unknown): string {
  if (raw == null) return "";
  try {
    return JSON.stringify(raw, null, 2);
  } catch {
    return "";
  }
}

type Props =
  | { mode: "create"; initial?: undefined }
  | { mode: "edit"; initial: SerializedNetwork };

export default function AdminNetworkEditor(props: Props) {
  const t = useTranslations("adminNetworks");
  const locale = useLocale();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const init = props.mode === "edit" ? props.initial : null;

  const [name, setName] = useState(init?.name ?? "");
  const [nameEn, setNameEn] = useState(init?.nameEn ?? "");
  const [description, setDescription] = useState(init?.description ?? "");
  const [type, setType] = useState(init?.type ?? "bus_shelter");
  const [regionsText, setRegionsText] = useState(
    (init?.regions ?? []).join(", "),
  );
  const [pricePerUnit, setPricePerUnit] = useState(
    init?.pricePerUnit != null ? String(init.pricePerUnit) : "",
  );
  const [pricePackage, setPricePackage] = useState(
    init?.pricePackage != null ? String(init.pricePackage) : "",
  );
  const [priceNote, setPriceNote] = useState(init?.priceNote ?? "");
  const [minUnits, setMinUnits] = useState(String(init?.minUnits ?? 1));
  const [packageOptionsText, setPackageOptionsText] = useState(
    serializePackageOptions(init?.packageOptions),
  );
  const [city, setCity] = useState(init?.city ?? "");
  const [district, setDistrict] = useState(init?.district ?? "");
  const [image, setImage] = useState(init?.image ?? "");
  const [galleryText, setGalleryText] = useState(
    (init?.galleryImages ?? []).join("\n"),
  );
  const [features, setFeatures] = useState(init?.features ?? "");
  const [visibilityScore, setVisibilityScore] = useState(
    init?.visibilityScore != null ? String(init.visibilityScore) : "",
  );
  const [dailyFootfall, setDailyFootfall] = useState(
    init?.dailyFootfall != null ? String(init.dailyFootfall) : "",
  );
  const [targetAge, setTargetAge] = useState(init?.targetAge ?? "");
  const [effectMemo, setEffectMemo] = useState(init?.effectMemo ?? "");
  const [operatingHours, setOperatingHours] = useState(
    init?.operatingHours ?? "",
  );
  const [tagsText, setTagsText] = useState((init?.tags ?? []).join(", "));
  const [isActive, setIsActive] = useState(init?.isActive ?? true);
  const [locRows, setLocRows] = useState<LocRow[]>(() => {
    if (init?.locations?.length) {
      return init.locations.map((l) => ({
        name: l.name,
        address: l.address ?? "",
        fullAddress: l.fullAddress ?? "",
        regionMain: l.regionMain ?? "",
        regionSub: l.regionSub ?? "",
        unitCount: l.unitCount != null ? String(l.unitCount) : "1",
        lat: l.latitude != null ? String(l.latitude) : "",
        lng: l.longitude != null ? String(l.longitude) : "",
        priceNote: l.priceNote ?? "",
        dailyFootfall:
          l.dailyFootfall != null ? String(l.dailyFootfall) : "",
        note: l.note ?? "",
      }));
    }
    return [emptyLocRow()];
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUploadBusy, setImageUploadBusy] = useState(false);

  const [activeTab, setActiveTab] = useState<"form" | "json">("form");
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonParsed, setJsonParsed] = useState<Record<string, unknown> | null>(
    null,
  );

  const regionsArr = useCallback(() => {
    return regionsText
      .split(/[,，\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [regionsText]);

  const galleryArr = useCallback(() => {
    return galleryText
      .split(/[,，\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [galleryText]);

  const buildLocationsPayload = useCallback(() => {
    return locRows
      .filter((r) => r.name.trim())
      .map((r) => ({
        name: r.name.trim(),
        address: r.address.trim() || null,
        fullAddress: r.fullAddress.trim() || null,
        regionMain: r.regionMain.trim() || null,
        regionSub: r.regionSub.trim() || null,
        unitCount: Math.max(1, Math.round(Number(r.unitCount) || 1)),
        latitude: r.lat.trim() === "" ? null : Number(r.lat),
        longitude: r.lng.trim() === "" ? null : Number(r.lng),
        priceNote: r.priceNote.trim() || null,
        dailyFootfall:
          r.dailyFootfall.trim() === ""
            ? null
            : Math.round(Number(r.dailyFootfall) || 0),
        note: r.note.trim() || null,
      }))
      .map((r) => ({
        ...r,
        latitude:
          r.latitude != null && Number.isFinite(r.latitude)
            ? r.latitude
            : null,
        longitude:
          r.longitude != null && Number.isFinite(r.longitude)
            ? r.longitude
            : null,
      }));
  }, [locRows]);

  /** 개별 위치 행에서 자동 집계 — 지점 수(개소)·총 구좌 수·이름 누락 경고 */
  const locStats = (() => {
    const named = locRows.filter((r) => r.name.trim());
    const siteCount = named.length;
    const unitTotal = named.reduce(
      (s, r) => s + Math.max(1, Math.round(Number(r.unitCount) || 1)),
      0,
    );
    // 이름은 비었지만 다른 정보(주소·좌표·유동인구 등)가 입력된 행 → 저장 시 누락되므로 경고
    const blankWithData = locRows.filter(
      (r) =>
        !r.name.trim() &&
        (r.address.trim() ||
          r.fullAddress.trim() ||
          r.lat.trim() ||
          r.lng.trim() ||
          r.dailyFootfall.trim() ||
          r.priceNote.trim() ||
          r.note.trim()),
    ).length;
    return { siteCount, unitTotal, blankWithData };
  })();

  const parsePackageOptionsField = useCallback((): unknown => {
    const s = packageOptionsText.trim();
    if (!s) return null;
    return JSON.parse(s) as unknown;
  }, [packageOptionsText]);

  const tagsArray = useCallback(() => {
    return tagsText
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [tagsText]);

  const buildFormBody = useCallback(() => {
    const locations = buildLocationsPayload();
    // 총 지점 수(개소)는 개별 위치 행 기준으로 자동 산출 — 자유 입력 제거로 110/103 불일치 차단
    const tl = locations.length;
    const mu = Math.max(1, Math.round(Number(minUnits) || 1));
    const ppu =
      pricePerUnit.trim() === ""
        ? null
        : Math.round(Number(pricePerUnit) || 0);
    const ppk =
      pricePackage.trim() === ""
        ? null
        : Math.round(Number(pricePackage) || 0);
    const visRaw = Math.round(Number(visibilityScore) || 0);
    const vis =
      Number.isFinite(visRaw) ? Math.max(0, Math.min(100, visRaw)) : null;
    const df =
      dailyFootfall.trim() === ""
        ? null
        : Math.round(Number(dailyFootfall) || 0);

    return {
      name: name.trim(),
      nameEn: nameEn.trim() || null,
      description: description.trim() || null,
      type,
      totalLocations: tl,
      regions: regionsArr(),
      pricePerUnit: ppu,
      pricePackage: ppk,
      priceNote: priceNote.trim() || null,
      minUnits: mu,
      city: city.trim() || null,
      district: district.trim() || null,
      image: image.trim() || null,
      galleryImages: galleryArr(),
      features: features.trim() || null,
      packageOptions: packageOptionsText.trim()
        ? parsePackageOptionsField()
        : null,
      visibilityScore: vis,
      dailyFootfall: df,
      targetAge: targetAge.trim() || null,
      effectMemo: effectMemo.trim() || null,
      operatingHours: operatingHours.trim() || null,
      tags: tagsArray(),
      isActive,
      locations,
    };
  }, [
    name,
    nameEn,
    description,
    type,
    regionsArr,
    pricePerUnit,
    pricePackage,
    priceNote,
    minUnits,
    city,
    district,
    image,
    galleryArr,
    features,
    packageOptionsText,
    parsePackageOptionsField,
    visibilityScore,
    dailyFootfall,
    targetAge,
    effectMemo,
    operatingHours,
    tagsArray,
    isActive,
    buildLocationsPayload,
  ]);

  const ensureJsonInitialized = useCallback(() => {
    if (jsonText.trim()) return;
    try {
      const body = buildFormBody();
      const formatted = JSON.stringify(body, null, 2);
      setJsonText(formatted);
      setJsonParsed(body);
      setJsonError(null);
    } catch (e) {
      setJsonError(
        e instanceof Error ? e.message : "폼 데이터를 JSON으로 변환하지 못했습니다.",
      );
    }
  }, [buildFormBody, jsonText]);

  const onJsonChange = useCallback((next: string) => {
    setJsonText(next);
    const trimmed = next.trim();
    if (!trimmed) {
      setJsonError("JSON이 비어 있습니다.");
      setJsonParsed(null);
      return;
    }
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (
        parsed === null ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        setJsonError("최상위는 객체여야 합니다.");
        setJsonParsed(null);
        return;
      }
      setJsonParsed(parsed as Record<string, unknown>);
      setJsonError(null);
    } catch (e) {
      setJsonParsed(null);
      setJsonError(
        `JSON 문법 오류: ${
          e instanceof Error ? e.message : "parse failed"
        }`,
      );
    }
  }, []);

  const uploadFileToBunny = useCallback(async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("file", file);
    const up = await fetch("/api/admin/upload/bunny", {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const upJson = (await up.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!up.ok || !upJson.url) {
      throw new Error(upJson.error ?? "업로드 실패");
    }
    return upJson.url;
  }, []);

  // /media 갤러리 편집기와 동일: 여러 장 업로드 + 순서 변경(드래그). 성공한 URL 배열을 반환.
  const uploadGalleryFiles = useCallback(
    async (files: File[]): Promise<string[]> => {
      const images = files.filter((f) => f.type.startsWith("image/"));
      if (images.length === 0) return [];
      setImageUploadBusy(true);
      setError(null);
      const urls: string[] = [];
      const errors: string[] = [];
      try {
        // 하나 실패해도 나머지는 계속 진행
        for (const file of images) {
          try {
            urls.push(await uploadFileToBunny(file));
          } catch (fileError) {
            errors.push(
              `${file.name}: ${fileError instanceof Error ? fileError.message : "업로드 실패"}`,
            );
          }
        }
      } finally {
        setImageUploadBusy(false);
      }
      if (errors.length > 0) {
        setError(
          urls.length === 0
            ? "모든 이미지 업로드에 실패했습니다.\n" + errors.join("\n")
            : `${urls.length}개 업로드 성공, ${errors.length}개 실패:\n${errors.join("\n")}`,
        );
      }
      return urls;
    },
    [uploadFileToBunny],
  );

  const onCsv = useCallback(
    (file: File | null) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? "");
        const parsed = parseNetworkLocationsCsv(text);
        setLocRows((prev) => {
          const base = prev.some((r) => r.name.trim()) ? prev : [];
          const add: LocRow[] = parsed.map((p) => ({
            name: p.name,
            address: p.address ?? "",
            fullAddress: p.address ?? "",
            regionMain: p.regionMain ?? "",
            regionSub: p.regionSub ?? "",
            unitCount: String(p.unitCount ?? 1),
            lat: p.latitude != null ? String(p.latitude) : "",
            lng: p.longitude != null ? String(p.longitude) : "",
            priceNote: "",
            dailyFootfall: "",
            note: "",
          }));
          return [...base, ...add];
        });
      };
      reader.readAsText(file, "UTF-8");
      if (fileRef.current) fileRef.current.value = "";
    },
    [],
  );

  const submit = useCallback(async () => {
    setError(null);
    if (!name.trim() && activeTab === "form") {
      setError(locale === "en" ? "Name is required." : "이름을 입력하세요.");
      return;
    }
    if (activeTab === "json") {
      if (jsonError) {
        return;
      }
      if (!jsonParsed) {
        setError("유효한 JSON을 입력하세요.");
        return;
      }
    } else {
      if (packageOptionsText.trim()) {
        try {
          // 검증만 수행 (실제 변환은 buildFormBody에서 처리)
          void parsePackageOptionsField();
        } catch {
          setError(
            locale === "en"
              ? "Invalid package options JSON."
              : "패키지 JSON 형식이 올바르지 않습니다.",
          );
          return;
        }
      }
    }

    const body =
      activeTab === "json"
        ? (() => {
            const built = parseAndBuildNetworkCreateBodyFromObject(jsonParsed);
            if (!built.ok) {
              setError(built.error);
              return null;
            }
            return buildNetworkCreateBody(built.data!) as Record<string, unknown>;
          })()
        : buildFormBody();

    if (!body) return;

    setSubmitting(true);
    try {
      if (props.mode === "create") {
        const res = await fetch("/api/admin/networks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          setError(j.error ?? t("createError"));
          return;
        }
        const data = (await res.json()) as { network?: { id: string } };
        if (data.network?.id) {
          router.push(`/admin/networks/${data.network.id}`);
        }
      } else {
        const res = await fetch(`/api/admin/networks/${props.initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          setError(j.error ?? t("updateError"));
          return;
        }
        router.refresh();
      }
    } catch {
      setError(props.mode === "create" ? t("createError") : t("updateError"));
    } finally {
      setSubmitting(false);
    }
  }, [
    activeTab,
    jsonError,
    jsonParsed,
    buildFormBody,
    packageOptionsText,
    parsePackageOptionsField,
    name,
    props,
    router,
    t,
    locale,
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/networks">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("backToList")}
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {props.mode === "create" ? t("new") : name || t("title")}
        </h1>
        <p className="mt-1 text-sm text-slate-600">{t("subtitle")}</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab("form")}
          className={`flex-1 rounded-md px-3 py-1.5 ${ activeTab === "form" ? "border-2 border-border bg-card text-foreground shadow-sm" : "text-slate-500 hover:bg-slate-100" }`}
        >
          폼 편집
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("json");
            ensureJsonInitialized();
          }}
          className={`flex-1 rounded-md px-3 py-1.5 ${ activeTab === "json" ? "border-2 border-border bg-card text-foreground shadow-sm" : "text-slate-500 hover:bg-slate-100" }`}
        >
          JSON 편집
        </button>
      </div>

      {activeTab === "json" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">네트워크 JSON</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={jsonText}
              onChange={(e) => onJsonChange(e.target.value)}
              spellCheck={false}
              className="min-h-[420px] text-xs leading-relaxed"
              placeholder="{ ... }"
            />
            {jsonError && (
              <p className="text-xs text-red-600">{jsonError}</p>
            )}
            {!jsonError && jsonText.trim() && (
              <p className="text-xs text-slate-500">
                JSON 전체를 직접 수정할 수 있습니다. 잘못된 JSON은 저장할 수 없습니다.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "form" && (
        <>
          <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("basic")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700">
              {t("name")} *
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700">
              {t("nameEn")}
            </label>
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700">
              {t("type")}
            </label>
            <select
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {NETWORK_TYPE_CODES.map((code) => (
                <option key={code} value={code}>
                  {NETWORK_TYPE_LABELS[code]?.[
                    locale === "en" ? "en" : "ko"
                  ] ?? code}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700">
              {t("description")}
            </label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-3 sm:gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">
                {t("siteCountAuto")}
              </label>
              <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold tabular-nums text-slate-700">
                {locStats.siteCount.toLocaleString(locale === "en" ? "en-US" : "ko-KR")}
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">
                {t("unitTotalAuto")}
              </label>
              <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold tabular-nums text-violet-700">
                {locStats.unitTotal.toLocaleString(locale === "en" ? "en-US" : "ko-KR")}
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">
                {t("minUnits")}
              </label>
              <Input
                inputMode="numeric"
                value={minUnits}
                onChange={(e) => setMinUnits(e.target.value)}
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-slate-500">{t("autoFromLocations")}</p>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700">
              {t("regions")}
            </label>
            <Input
              placeholder={t("regionsHint")}
              value={regionsText}
              onChange={(e) => setRegionsText(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-300"
            />
            {t("isActive")}
          </label>
        </CardContent>
          </Card>

          <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("pricing")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">
                {t("pricePerUnit")}
              </label>
              <Input
                inputMode="numeric"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">
                {t("pricePackage")}
              </label>
              <Input
                inputMode="numeric"
                value={pricePackage}
                onChange={(e) => setPricePackage(e.target.value)}
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-amber-600">{t("priceUnitHint")}</p>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700">
              {t("priceNote")}
            </label>
            <Input
              value={priceNote}
              onChange={(e) => setPriceNote(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700">
              {t("packageOptions")}
            </label>
            <p className="text-xs text-slate-500">{t("packageOptionsHint")}</p>
            <Textarea
              rows={5}
              className="text-xs"
              value={packageOptionsText}
              onChange={(e) => setPackageOptionsText(e.target.value)}
              placeholder="[]"
            />
          </div>
        </CardContent>
          </Card>

          <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("targeting")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">
                {t("targetAge")}
              </label>
              <Input
                value={targetAge}
                onChange={(e) => setTargetAge(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">
                {t("dailyFootfall")}
              </label>
              <Input
                inputMode="numeric"
                value={dailyFootfall}
                onChange={(e) => setDailyFootfall(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">
                {t("visibilityScore")}
              </label>
              <Input
                inputMode="numeric"
                value={visibilityScore}
                onChange={(e) => setVisibilityScore(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">
                {t("operatingHours")}
              </label>
              <Input
                value={operatingHours}
                onChange={(e) => setOperatingHours(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">
                {t("city")}
              </label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">
                {t("district")}
              </label>
              <Input
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700">
              {t("tags")}
            </label>
            <Input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700">
              {t("effectMemo")}
            </label>
            <Textarea
              rows={2}
              value={effectMemo}
              onChange={(e) => setEffectMemo(e.target.value)}
            />
          </div>
        </CardContent>
          </Card>

          <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("media")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700">
              이미지 (여러 장 업로드 · 드래그로 순서 변경 · 첫 번째가 대표)
            </label>
            <MediaGalleryEditor
              urls={
                image.trim()
                  ? [
                      image.trim(),
                      ...galleryArr().filter((u) => u !== image.trim()),
                    ]
                  : galleryArr()
              }
              onChange={(urls) => {
                setImage(urls[0] ?? "");
                setGalleryText(urls.slice(1).join("\n"));
              }}
              onUploadFiles={uploadGalleryFiles}
              busy={imageUploadBusy}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700">
              {t("features")}
            </label>
            <Textarea
              rows={4}
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{t("locations")}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={(e) => onCsv(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              {t("csvUpload")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setLocRows((r) => [...r, emptyLocRow()])}
            >
              {t("addRow")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-500">{t("csvHint")}</p>
          {locStats.blankWithData > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {t("blankRowWarning", { count: locStats.blankWithData })}
            </div>
          )}
          <div className="space-y-2">
            {locRows.map((row, i) => (
              <div
                key={i}
                className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-3 sm:grid-cols-2 lg:grid-cols-4"
              >
                <Input
                  placeholder={t("locName")}
                  value={row.name}
                  onChange={(e) =>
                    setLocRows((rows) =>
                      rows.map((r, j) =>
                        j === i ? { ...r, name: e.target.value } : r,
                      ),
                    )
                  }
                />
                <Input
                  placeholder={t("locAddress")}
                  value={row.address}
                  onChange={(e) =>
                    setLocRows((rows) =>
                      rows.map((r, j) =>
                        j === i ? { ...r, address: e.target.value } : r,
                      ),
                    )
                  }
                  className="sm:col-span-2"
                />
                <Input
                  placeholder="전체 주소 (선택)"
                  value={row.fullAddress}
                  onChange={(e) =>
                    setLocRows((rows) =>
                      rows.map((r, j) =>
                        j === i ? { ...r, fullAddress: e.target.value } : r,
                      ),
                    )
                  }
                  className="sm:col-span-2"
                />
                <Input
                  placeholder={t("lat")}
                  value={row.lat}
                  onChange={(e) =>
                    setLocRows((rows) =>
                      rows.map((r, j) =>
                        j === i ? { ...r, lat: e.target.value } : r,
                      ),
                    )
                  }
                />
                <div className="flex gap-2">
                  <Input
                    placeholder={t("lng")}
                    value={row.lng}
                    onChange={(e) =>
                      setLocRows((rows) =>
                        rows.map((r, j) =>
                          j === i ? { ...r, lng: e.target.value } : r,
                        ),
                      )
                    }
                  />
                </div>
                <Input
                  placeholder={t("locUnitCount")}
                  inputMode="numeric"
                  value={row.unitCount}
                  onChange={(e) =>
                    setLocRows((rows) =>
                      rows.map((r, j) =>
                        j === i ? { ...r, unitCount: e.target.value } : r,
                      ),
                    )
                  }
                />
                <Input
                  placeholder="지점별 가격 메모"
                  value={row.priceNote}
                  onChange={(e) =>
                    setLocRows((rows) =>
                      rows.map((r, j) =>
                        j === i ? { ...r, priceNote: e.target.value } : r,
                      ),
                    )
                  }
                  className="sm:col-span-2"
                />
                <Input
                  placeholder="일일 유동인구 (선택)"
                  value={row.dailyFootfall}
                  onChange={(e) =>
                    setLocRows((rows) =>
                      rows.map((r, j) =>
                        j === i
                          ? { ...r, dailyFootfall: e.target.value }
                          : r,
                      ),
                    )
                  }
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="비고"
                    value={row.note}
                    onChange={(e) =>
                      setLocRows((rows) =>
                        rows.map((r, j) =>
                          j === i ? { ...r, note: e.target.value } : r,
                        ),
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-slate-500"
                    onClick={() =>
                      setLocRows((rows) =>
                        rows.length > 1 ? rows.filter((_, j) => j !== i) : rows,
                      )
                    }
                  >
                    {t("removeRow")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
        </>
      )}

      <div className="flex flex-wrap gap-3 pb-8">
        <Button
          type="button"
          disabled={
            submitting || (activeTab === "json" && !!jsonError)
          }
          onClick={() => submit()}
        >
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {props.mode === "create" ? t("create") : t("save")}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/admin/networks">{t("cancel")}</Link>
        </Button>
        {props.mode === "edit" && (
          <Button type="button" variant="secondary" asChild>
            <Link href={`/media/network/${props.initial.id}`} target="_blank">
              {t("publicPreview")}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
