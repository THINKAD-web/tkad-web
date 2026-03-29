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
import {
  NETWORK_TYPE_CODES,
  NETWORK_TYPE_LABELS,
} from "@/lib/media-network-types";
import { parseNetworkLocationsCsv } from "@/lib/network-locations-csv";

export type SerializedNetwork = {
  id: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  type: string;
  pricePerUnit: number | null;
  pricePackage: number | null;
  minUnits: number;
  totalLocations: number;
  regions: string[];
  image: string | null;
  galleryImages: string[];
  features: string | null;
  packageOptions: unknown;
  isActive: boolean;
  locations: Array<{
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  }>;
};

type LocRow = {
  name: string;
  address: string;
  lat: string;
  lng: string;
};

function emptyLocRow(): LocRow {
  return { name: "", address: "", lat: "", lng: "" };
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
  const [totalLocations, setTotalLocations] = useState(
    String(init?.totalLocations ?? ""),
  );
  const [regionsText, setRegionsText] = useState(
    (init?.regions ?? []).join(", "),
  );
  const [pricePerUnit, setPricePerUnit] = useState(
    init?.pricePerUnit != null ? String(init.pricePerUnit) : "",
  );
  const [pricePackage, setPricePackage] = useState(
    init?.pricePackage != null ? String(init.pricePackage) : "",
  );
  const [minUnits, setMinUnits] = useState(String(init?.minUnits ?? 1));
  const [packageOptionsText, setPackageOptionsText] = useState(
    serializePackageOptions(init?.packageOptions),
  );
  const [image, setImage] = useState(init?.image ?? "");
  const [galleryText, setGalleryText] = useState(
    (init?.galleryImages ?? []).join("\n"),
  );
  const [features, setFeatures] = useState(init?.features ?? "");
  const [isActive, setIsActive] = useState(init?.isActive ?? true);
  const [locRows, setLocRows] = useState<LocRow[]>(() => {
    if (init?.locations?.length) {
      return init.locations.map((l) => ({
        name: l.name,
        address: l.address ?? "",
        lat: l.latitude != null ? String(l.latitude) : "",
        lng: l.longitude != null ? String(l.longitude) : "",
      }));
    }
    return [emptyLocRow()];
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        latitude: r.lat.trim() === "" ? null : Number(r.lat),
        longitude: r.lng.trim() === "" ? null : Number(r.lng),
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

  const parsePackageOptionsField = useCallback((): unknown => {
    const s = packageOptionsText.trim();
    if (!s) return null;
    return JSON.parse(s) as unknown;
  }, [packageOptionsText]);

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
            lat: p.latitude != null ? String(p.latitude) : "",
            lng: p.longitude != null ? String(p.longitude) : "",
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
    if (!name.trim()) {
      setError(locale === "en" ? "Name is required." : "이름을 입력하세요.");
      return;
    }
    let packageOptions: unknown = null;
    if (packageOptionsText.trim()) {
      try {
        packageOptions = parsePackageOptionsField();
      } catch {
        setError(
          locale === "en"
            ? "Invalid package options JSON."
            : "패키지 JSON 형식이 올바르지 않습니다.",
        );
        return;
      }
    }

    const tl = Math.max(0, Math.round(Number(totalLocations) || 0));
    const mu = Math.max(1, Math.round(Number(minUnits) || 1));
    const ppu =
      pricePerUnit.trim() === ""
        ? null
        : Math.round(Number(pricePerUnit) || 0);
    const ppk =
      pricePackage.trim() === ""
        ? null
        : Math.round(Number(pricePackage) || 0);

    const body = {
      name: name.trim(),
      nameEn: nameEn.trim() || null,
      description: description.trim() || null,
      type,
      totalLocations: tl,
      regions: regionsArr(),
      pricePerUnit: ppu,
      pricePackage: ppk,
      minUnits: mu,
      packageOptions,
      image: image.trim() || null,
      galleryImages: galleryArr(),
      features: features.trim() || null,
      isActive,
      locations: buildLocationsPayload(),
    };

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
    name,
    nameEn,
    description,
    type,
    totalLocations,
    regionsArr,
    pricePerUnit,
    pricePackage,
    minUnits,
    packageOptionsText,
    parsePackageOptionsField,
    image,
    galleryArr,
    features,
    isActive,
    buildLocationsPayload,
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
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

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
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">
                {t("totalLocations")}
              </label>
              <Input
                inputMode="numeric"
                value={totalLocations}
                onChange={(e) => setTotalLocations(e.target.value)}
              />
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
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700">
              {t("packageOptions")}
            </label>
            <p className="text-xs text-slate-500">{t("packageOptionsHint")}</p>
            <Textarea
              rows={5}
              className="font-mono text-xs"
              value={packageOptionsText}
              onChange={(e) => setPackageOptionsText(e.target.value)}
              placeholder="[]"
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
              {t("imageUrl")}
            </label>
            <Input value={image} onChange={(e) => setImage(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700">
              {t("galleryUrls")}
            </label>
            <Textarea
              rows={3}
              value={galleryText}
              onChange={(e) => setGalleryText(e.target.value)}
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
          <div className="space-y-2">
            {locRows.map((row, i) => (
              <div
                key={i}
                className="grid gap-2 rounded-lg border border-slate-100 bg-slate-50/80 p-3 sm:grid-cols-2 lg:grid-cols-4"
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

      <div className="flex flex-wrap gap-3 pb-8">
        <Button type="button" disabled={submitting} onClick={() => submit()}>
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
