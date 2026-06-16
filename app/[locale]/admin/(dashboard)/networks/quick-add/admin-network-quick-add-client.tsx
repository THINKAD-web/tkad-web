"use client";

import { useCallback, useMemo, useState, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Upload,
  MapPin,
} from "lucide-react";
import {
  NETWORK_TYPE_CODES,
  NETWORK_TYPE_LABELS,
} from "@/lib/media-network-types";
import { parseNetworkLocationsCsv } from "@/lib/network-locations-csv";
import {
  buildNetworkCreateBody,
  inferRegionsFromAddresses,
  parseNetworkQuickAddJson,
} from "@/lib/network-quick-add";
import { NetworkQuickAddAiTab } from "@/components/admin/network-quick-add-ai-tab";

const SAMPLE_FULL_JSON = `{
  "media_name": "수도권 버스쉘터 패키지",
  "name_en": "Capital area bus shelters",
  "sub_category": "버스쉘터",
  "description": "주요 거점 정류장 디지털 패널",
  "tags": ["버스쉘터", "가로변", "디지털"],
  "full_address": "서울 강남구 강남대로 396",
  "city": "서울",
  "district": "강남구",
  "latitude": 37.498,
  "longitude": 127.028,
  "price_per_month": 450000,
  "price_note": "VAT 별도 · 면당 원/월",
  "min_units": 10,
  "daily_footfall": 6500,
  "visibility_score": 88,
  "target_age": "20–40대",
  "operating_hours": "06:00–24:00",
  "effect_memo": "역세권 고유동 노출",
  "extracted_images": [
    "https://res.cloudinary.com/demo/image/upload/w_800/sample.jpg"
  ],
  "locations": [
    { "name": "강남역 1번", "full_address": "서울 강남구 강남대로 396", "latitude": 37.498, "longitude": 127.028 },
    { "name": "홍대입구", "full_address": "서울 마포구 양화로 188" }
  ]
}`;

type Mode = "ai" | "fullJson" | "fields";

type LocRow = { name: string; address: string; lat: string; lng: string };

function emptyRow(): LocRow {
  return { name: "", address: "", lat: "", lng: "" };
}

export default function AdminNetworkQuickAddClient() {
  const locale = useLocale();
  const isEn = locale === "en";
  const router = useRouter();
  const csvRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>("ai");
  const [fullJsonText, setFullJsonText] = useState("");
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [type, setType] = useState<string>("bus_shelter");
  const [description, setDescription] = useState("");
  const [minUnits, setMinUnits] = useState("1");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [pricePackage, setPricePackage] = useState("");
  const [locationsJson, setLocationsJson] = useState("[]");
  const [locRows, setLocRows] = useState<LocRow[]>([emptyRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewRegions, setPreviewRegions] = useState<string[]>([]);
  const [previewCount, setPreviewCount] = useState(0);

  const parseFull = useMemo(() => {
    if (!fullJsonText.trim()) return null;
    return parseNetworkQuickAddJson(fullJsonText);
  }, [fullJsonText]);

  const updatePreviewFromLocations = useCallback(
    (
      locs: Array<{ name: string; address: string | null; lat?: number | null; lng?: number | null }>,
    ) => {
      const addrs = locs.map((l) => l.address ?? "").filter(Boolean);
      setPreviewRegions(inferRegionsFromAddresses(addrs));
      setPreviewCount(locs.filter((l) => l.name.trim()).length);
    },
    [],
  );

  const onCsvPick = useCallback(
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
            lat: p.latitude != null ? String(p.latitude) : "",
            lng: p.longitude != null ? String(p.longitude) : "",
          }));
          const merged = [...base, ...add];
          updatePreviewFromLocations(
            merged
              .filter((r) => r.name.trim())
              .map((r) => ({
                name: r.name.trim(),
                address: r.address.trim() || null,
              })),
          );
          return merged.length ? merged : [emptyRow()];
        });
      };
      reader.readAsText(file, "UTF-8");
      if (csvRef.current) csvRef.current.value = "";
    },
    [updatePreviewFromLocations],
  );

  const geocodeRows = useCallback(async () => {
    setError(null);
    const rows = locRows
      .filter((r) => r.name.trim() && r.address.trim())
      .map((r) => ({ name: r.name.trim(), address: r.address.trim() }));
    if (rows.length === 0) {
      setError(
        isEn
          ? "Enter at least one row with name and address."
          : "이름·주소가 있는 행을 한 줄 이상 입력하세요.",
      );
      return;
    }
    setGeocoding(true);
    try {
      const res = await fetch("/api/admin/networks/geocode-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        locations?: Array<{
          name: string;
          address: string | null;
          latitude: number | null;
          longitude: number | null;
        }>;
        error?: string;
      };
      if (!res.ok) {
        setError(j.error ?? (isEn ? "Geocode failed" : "지오코딩 실패"));
        return;
      }
      const locs = j.locations ?? [];
      const byName = new Map(locs.map((l) => [l.name, l]));
      setLocRows((prev) =>
        prev.map((r) => {
          const hit = byName.get(r.name.trim());
          if (!hit) return r;
          return {
            ...r,
            lat:
              hit.latitude != null ? String(hit.latitude) : r.lat,
            lng:
              hit.longitude != null ? String(hit.longitude) : r.lng,
            address: hit.address ?? r.address,
          };
        }),
      );
      updatePreviewFromLocations(
        locs.map((l) => ({
          name: l.name,
          address: l.address,
        })),
      );
    } catch {
      setError(isEn ? "Geocode request failed" : "지오코딩 요청 실패");
    } finally {
      setGeocoding(false);
    }
  }, [locRows, isEn, updatePreviewFromLocations]);

  const buildBodyFromFields = useCallback(() => {
    let locsParsed: unknown;
    try {
      locsParsed = JSON.parse(locationsJson) as unknown;
    } catch {
      throw new Error(
        isEn ? "Locations JSON is invalid." : "locations JSON 형식 오류",
      );
    }
    const fake = JSON.stringify({
      name: name.trim(),
      nameEn: nameEn.trim() || null,
      description: description.trim() || null,
      type,
      minUnits: Math.max(1, Math.round(Number(minUnits) || 1)),
      pricePerUnit:
        pricePerUnit.trim() === "" ? null : Math.round(Number(pricePerUnit)),
      pricePackage:
        pricePackage.trim() === "" ? null : Math.round(Number(pricePackage)),
      locations: Array.isArray(locsParsed)
        ? locsParsed
        : locsParsed && typeof locsParsed === "object"
          ? [locsParsed]
          : [],
    });
    const r = parseNetworkQuickAddJson(fake);
    if (!r.ok) throw new Error(r.error);

    const fromTable = locRows
      .filter((row) => row.name.trim())
      .map((row) => ({
        name: row.name.trim(),
        address: row.address.trim() || null,
        latitude:
          row.lat.trim() === "" ? null : Number(row.lat),
        longitude:
          row.lng.trim() === "" ? null : Number(row.lng),
      }))
      .map((row) => ({
        ...row,
        latitude:
          row.latitude != null && Number.isFinite(row.latitude)
            ? row.latitude
            : null,
        longitude:
          row.longitude != null && Number.isFinite(row.longitude)
            ? row.longitude
            : null,
      }));

    const mergedLocs =
      fromTable.length > 0 && r.data.locations.length > 0
        ? [...r.data.locations, ...fromTable]
        : fromTable.length > 0
          ? fromTable
          : r.data.locations;

    return buildNetworkCreateBody({
      ...r.data,
      locations: mergedLocs,
    });
  }, [
    name,
    nameEn,
    description,
    type,
    minUnits,
    pricePerUnit,
    pricePackage,
    locationsJson,
    locRows,
    isEn,
  ]);

  const registerNetwork = useCallback(
    async (body: Record<string, unknown>) => {
      setError(null);
      setSubmitting(true);
      try {
        const res = await fetch("/api/admin/networks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const t = await res.text().catch(() => "");
        if (!res.ok) {
          let msg = isEn ? "Create failed" : "등록 실패";
          try {
            const j = JSON.parse(t) as { error?: string; code?: string };
            if (j.error) msg = j.error;
            else if (j.code === "DATABASE_NOT_CONFIGURED") {
              msg = isEn
                ? "Database not configured (DATABASE_URL)"
                : "DB 연결 미설정 (DATABASE_URL)";
            }
          } catch {
            if (t.trim()) msg = t.slice(0, 300);
          }
          setError(msg);
          return;
        }
        const data = JSON.parse(t || "{}") as { network?: { id: string } };
        if (data.network?.id) {
          router.push(`/admin/networks/${data.network.id}`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setSubmitting(false);
      }
    },
    [router, isEn],
  );

  const submit = useCallback(async () => {
    try {
      let body: Record<string, unknown>;
      if (mode === "fullJson") {
        if (!parseFull || !parseFull.ok) {
          setError(
            parseFull && !parseFull.ok
              ? parseFull.error
              : isEn
                ? "Paste valid JSON."
                : "JSON을 입력하세요.",
          );
          return;
        }
        const d = parseFull.data;
        body = buildNetworkCreateBody(d);
      } else {
        body = buildBodyFromFields();
      }
      await registerNetwork(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [mode, parseFull, buildBodyFromFields, registerNetwork, isEn]);

  const onEditAiJson = useCallback((json: string) => {
    setFullJsonText(json);
    setMode("fullJson");
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/networks">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {isEn ? "Networks" : "네트워크 목록"}
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {isEn ? "Quick add network" : "네트워크 빠른 등록"}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {isEn
            ? "Describe in plain language (AI), paste JSON (same snake_case fields as media quick-add), or use form fields + locations CSV."
            : "말로 설명하면 AI가 JSON을 작성합니다. 일반 매체 빠른 등록과 동일한 JSON 키(media_name, full_address, price_per_month 등)로 붙여넣을 수 있습니다."}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={mode === "ai" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("ai")}
        >
          {isEn ? "AI draft" : "AI로 작성"}
        </Button>
        <Button
          type="button"
          variant={mode === "fullJson" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("fullJson")}
        >
          {isEn ? "Full JSON" : "전체 JSON"}
        </Button>
        <Button
          type="button"
          variant={mode === "fields" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("fields")}
        >
          {isEn ? "Fields + locations" : "개별 필드 + 지점"}
        </Button>
      </div>

      {mode === "ai" ? (
        <NetworkQuickAddAiTab
          isEn={isEn}
          submitting={submitting}
          onRegister={registerNetwork}
          onEditJson={onEditAiJson}
        />
      ) : mode === "fullJson" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isEn ? "Network JSON" : "네트워크 JSON"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-500">
              {isEn
                ? "Use the same basic keys as /admin/medias/quick-add (media_name, full_address, price_per_month, …). Add network-only fields: sub_category or type, locations[], min_units."
                : "기본 필드는 /admin/medias/quick-add 와 동일합니다 (media_name, full_address, price_per_month 등). 네트워크 전용: sub_category 또는 type, locations[], min_units."}
            </p>
            <Textarea
              rows={18}
              className="text-xs"
              value={fullJsonText}
              onChange={(e) => setFullJsonText(e.target.value)}
              placeholder={SAMPLE_FULL_JSON}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setFullJsonText(SAMPLE_FULL_JSON)}
            >
              {isEn ? "Load sample" : "샘플 불러오기"}
            </Button>
            {parseFull && !parseFull.ok && (
              <p className="text-sm text-red-600">{parseFull.error}</p>
            )}
            {parseFull && parseFull.ok && (
              <p className="text-sm text-slate-600">
                {isEn ? "OK:" : "확인:"}{" "}
                {parseFull.data.locations.length}{" "}
                {isEn ? "locations · regions:" : "지점 · regions:"}{" "}
                {(parseFull.data.regions.length > 0
                  ? parseFull.data.regions
                  : inferRegionsFromAddresses(
                      parseFull.data.locations
                        .map((l) => l.address ?? "")
                        .filter(Boolean),
                    )
                ).join(", ") || (isEn ? "(none)" : "(없음)")}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {isEn ? "Basics" : "기본 정보"}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2 sm:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  media_name *
                </label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-700">name_en</label>
                <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-700">
                  type * ({isEn ? "network code" : "네트워크 유형"})
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  {NETWORK_TYPE_CODES.map((code) => (
                    <option key={code} value={code}>
                      {NETWORK_TYPE_LABELS[code]?.[isEn ? "en" : "ko"] ?? code}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  description
                </label>
                <Textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-700">
                  min_units
                </label>
                <Input
                  inputMode="numeric"
                  value={minUnits}
                  onChange={(e) => setMinUnits(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-700">
                  price_per_month ({isEn ? "KRW/unit" : "원/면"})
                </label>
                <Input
                  inputMode="numeric"
                  value={pricePerUnit}
                  onChange={(e) => setPricePerUnit(e.target.value)}
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  price_package ({isEn ? "KRW" : "원"})
                </label>
                <Input
                  inputMode="numeric"
                  value={pricePackage}
                  onChange={(e) => setPricePackage(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {isEn ? "Locations JSON array" : "지점 JSON 배열"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                rows={8}
                className="text-xs"
                value={locationsJson}
                onChange={(e) => {
                  setLocationsJson(e.target.value);
                  try {
                    const arr = JSON.parse(e.target.value) as unknown;
                    if (Array.isArray(arr)) {
                      updatePreviewFromLocations(
                        arr
                          .filter(
                            (x): x is Record<string, unknown> =>
                              x != null && typeof x === "object",
                          )
                          .map((x) => ({
                            name: String(x.name ?? "").trim(),
                            address:
                              typeof x.address === "string"
                                ? x.address.trim() || null
                                : null,
                          }))
                          .filter((x) => x.name),
                      );
                    }
                  } catch {
                    /* ignore */
                  }
                }}
                placeholder='[{"name":"A","address":"서울 ..."}]'
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">
                  {isEn ? "Table / CSV" : "표 입력 · CSV"}
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={csvRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => onCsvPick(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => csvRef.current?.click()}
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    CSV
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={geocodeRows}
                    disabled={geocoding}
                  >
                    {geocoding ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <MapPin className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {isEn ? "Geocode addresses" : "주소 → 위경도 (Kakao)"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-500">
                {isEn
                  ? "Columns: name, address, lat, lng. Geocode fills lat/lng from address (server uses KAKAO_REST_API_KEY)."
                  : "열: name, address, lat, lng. 주소만 있으면 Kakao API로 위경도 채움 (서버 KAKAO_REST_API_KEY)."}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs text-slate-500">
                      <th className="py-2 pr-2">name *</th>
                      <th className="py-2 pr-2">address</th>
                      <th className="py-2 pr-2">lat</th>
                      <th className="py-2 pr-2">lng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locRows.map((row, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-1.5 pr-2">
                          <Input
                            className="h-8 text-xs"
                            value={row.name}
                            onChange={(e) => {
                              const next = [...locRows];
                              next[i] = { ...row, name: e.target.value };
                              setLocRows(next);
                              updatePreviewFromLocations(
                                next
                                  .filter((r) => r.name.trim())
                                  .map((r) => ({
                                    name: r.name.trim(),
                                    address: r.address.trim() || null,
                                  })),
                              );
                            }}
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <Input
                            className="h-8 text-xs"
                            value={row.address}
                            onChange={(e) => {
                              const next = [...locRows];
                              next[i] = { ...row, address: e.target.value };
                              setLocRows(next);
                            }}
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <Input
                            className="h-8 text-xs"
                            value={row.lat}
                            onChange={(e) => {
                              const next = [...locRows];
                              next[i] = { ...row, lat: e.target.value };
                              setLocRows(next);
                            }}
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <Input
                            className="h-8 text-xs"
                            value={row.lng}
                            onChange={(e) => {
                              const next = [...locRows];
                              next[i] = { ...row, lng: e.target.value };
                              setLocRows(next);
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLocRows((r) => [...r, emptyRow()])}
              >
                {isEn ? "Add row" : "행 추가"}
              </Button>
              <p className="text-xs text-slate-600">
                {isEn ? "Preview — sites:" : "미리보기 — 지점 수:"}{" "}
                {previewCount}
                {" · regions: "}
                {previewRegions.join(", ") || (isEn ? "(auto)" : "(자동)")}
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {mode !== "ai" ? (
        <Button
          type="button"
          className="w-full sm:w-auto"
          disabled={submitting}
          onClick={submit}
        >
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {isEn ? "Create network" : "네트워크 등록"}
        </Button>
      ) : null}
    </div>
  );
}
