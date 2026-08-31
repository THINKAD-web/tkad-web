"use client";

import { Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { adminFetchJson } from "@/lib/admin-client-fetch";
import { mediaNameEnPlaceholder } from "@/lib/media-country";

export type AdminMediaEnFormSlice = {
  name: string;
  nameEn: string;
  location: string;
  locationEn: string;
  description: string;
  descriptionEn: string;
  country: string;
};

export type AiDraftFieldFlags = {
  nameEn: boolean;
  locationEn: boolean;
  descriptionEn: boolean;
};

type Props = {
  form: AdminMediaEnFormSlice;
  setForm: React.Dispatch<React.SetStateAction<AdminMediaEnFormSlice>>;
  aiDraftFields: AiDraftFieldFlags;
  setAiDraftFields: React.Dispatch<React.SetStateAction<AiDraftFieldFlags>>;
  aiTranslateLoading: boolean;
  aiTranslateError: string | null;
  editDetailLoading: boolean;
  onTranslate: () => Promise<void>;
};

export function AdminMediaEnTranslateFields({
  form,
  setForm,
  aiDraftFields,
  setAiDraftFields,
  aiTranslateLoading,
  aiTranslateError,
  editDetailLoading,
  onTranslate,
}: Props) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="tkad-type-title text-foreground">영문 카탈로그 (선택)</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={aiTranslateLoading || editDetailLoading}
          onClick={() => void onTranslate()}
        >
          {aiTranslateLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-[color:var(--qp-accent)]" />
          )}
          AI 영문 번역
        </Button>
      </div>
      {aiTranslateError ? (
        <p className="tkad-type-caption text-red-600">{aiTranslateError}</p>
      ) : (
        <p className="tkad-type-note text-muted-foreground">
          한국어 매체명·위치·설명을 바탕으로 영문 초안을 생성합니다. 저장 전까지 DB에
          반영되지 않습니다.
        </p>
      )}
      <div>
        <label className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          매체명 (영어)
          {aiDraftFields.nameEn ? (
            <Badge variant="outline" className="h-4 px-1.5 tkad-type-note font-normal">
              AI 초안
            </Badge>
          ) : null}
        </label>
        <Input
          value={form.nameEn}
          onChange={(e) => {
            setAiDraftFields((d) => ({ ...d, nameEn: false }));
            setForm((f) => ({ ...f, nameEn: e.target.value }));
          }}
          placeholder={mediaNameEnPlaceholder(form.country, true)}
        />
      </div>
      <div>
        <label className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          위치 (영어)
          {aiDraftFields.locationEn ? (
            <Badge variant="outline" className="h-4 px-1.5 tkad-type-note font-normal">
              AI 초안
            </Badge>
          ) : null}
        </label>
        <Input
          value={form.locationEn}
          onChange={(e) => {
            setAiDraftFields((d) => ({ ...d, locationEn: false }));
            setForm((f) => ({ ...f, locationEn: e.target.value }));
          }}
          placeholder="e.g. Shibuya, Tokyo"
        />
      </div>
      <div>
        <label className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          설명 (영어)
          {aiDraftFields.descriptionEn ? (
            <Badge variant="outline" className="h-4 px-1.5 tkad-type-note font-normal">
              AI 초안
            </Badge>
          ) : null}
        </label>
        <Textarea
          rows={3}
          value={form.descriptionEn}
          onChange={(e) => {
            setAiDraftFields((d) => ({ ...d, descriptionEn: false }));
            setForm((f) => ({ ...f, descriptionEn: e.target.value }));
          }}
          placeholder="English catalog description for advertisers"
        />
      </div>
    </div>
  );
}

export async function fetchMediaEnTranslation(form: AdminMediaEnFormSlice): Promise<
  | { ok: true; data: { nameEn?: string; descriptionEn?: string | null; locationEn?: string | null } }
  | { ok: false; message: string }
> {
  const name = form.name.trim();
  const location = form.location.trim();
  if (!name || !location) {
    return { ok: false, message: "한국어 매체명과 위치(주소)를 먼저 입력하세요." };
  }
  const res = await adminFetchJson("/api/admin/medias/ai-translate", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      location,
      description: form.description.trim() || undefined,
      country: form.country,
    }),
  });
  if (!res.ok) return { ok: false, message: res.message || "AI 번역 생성 실패" };
  return { ok: true, data: res.data as Record<string, unknown> };
}
