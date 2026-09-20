"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { mediaNameEnPlaceholder, mediaNameKoPlaceholder } from "@/lib/media-country";
import type { AdminMediaTranslationLocale } from "@/lib/admin-media-translations";

export type AdminMediaLocaleFormSlice = {
  name: string;
  nameEn: string;
  location: string;
  locationEn: string;
  description: string;
  descriptionEn: string;
  country: string;
  translationJaName: string;
  translationJaLocation: string;
  translationJaDescription: string;
  translationZhName: string;
  translationZhLocation: string;
  translationZhDescription: string;
};

export type AdminMediaTranslationSource = "ai" | "reviewed" | null;

export type AiDraftFieldFlags = {
  nameEn: boolean;
  locationEn: boolean;
  descriptionEn: boolean;
  translationJaName: boolean;
  translationJaLocation: boolean;
  translationJaDescription: boolean;
  translationZhName: boolean;
  translationZhLocation: boolean;
  translationZhDescription: boolean;
};

type Props<F extends AdminMediaLocaleFormSlice> = {
  form: F;
  setForm: React.Dispatch<React.SetStateAction<F>>;
  translationSourceJa: AdminMediaTranslationSource;
  translationSourceZh: AdminMediaTranslationSource;
  aiDraftFields: AiDraftFieldFlags;
  setAiDraftFields: React.Dispatch<React.SetStateAction<AiDraftFieldFlags>>;
  aiTranslateLoading: boolean;
  aiTranslateError: string | null;
  editDetailLoading: boolean;
  onTranslate: () => Promise<void>;
};

type LocaleTab = "ko" | "en" | "ja" | "zh";

function sourceBadge(source: AdminMediaTranslationSource, aiDraft: boolean) {
  if (aiDraft && source !== "reviewed") {
    return (
      <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-normal">
        AI 초안
      </Badge>
    );
  }
  if (source === "reviewed") {
    return (
      <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-normal">
        검수완료
      </Badge>
    );
  }
  if (source === "ai") {
    return (
      <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-normal">
        AI 초안
      </Badge>
    );
  }
  return null;
}

function hasTranslationContent(form: AdminMediaLocaleFormSlice, locale: AdminMediaTranslationLocale) {
  if (locale === "ja") {
    return Boolean(
      form.translationJaName.trim() ||
        form.translationJaLocation.trim() ||
        form.translationJaDescription.trim(),
    );
  }
  return Boolean(
    form.translationZhName.trim() ||
      form.translationZhLocation.trim() ||
      form.translationZhDescription.trim(),
  );
}

export function AdminMediaLocaleTabs<F extends AdminMediaLocaleFormSlice>({
  form,
  setForm,
  translationSourceJa,
  translationSourceZh,
  aiDraftFields,
  setAiDraftFields,
  aiTranslateLoading,
  aiTranslateError,
  editDetailLoading,
  onTranslate,
}: Props<F>) {
  const [activeTab, setActiveTab] = useState<LocaleTab>("ko");

  const renderCjkTab = (locale: AdminMediaTranslationLocale) => {
    const isJa = locale === "ja";
    const source = isJa ? translationSourceJa : translationSourceZh;
    const nameKey = isJa ? "translationJaName" : "translationZhName";
    const locKey = isJa ? "translationJaLocation" : "translationZhLocation";
    const descKey = isJa ? "translationJaDescription" : "translationZhDescription";
    const draftName = isJa ? aiDraftFields.translationJaName : aiDraftFields.translationZhName;
    const draftLoc = isJa ? aiDraftFields.translationJaLocation : aiDraftFields.translationZhLocation;
    const draftDesc = isJa ? aiDraftFields.translationJaDescription : aiDraftFields.translationZhDescription;
    const hasContent = hasTranslationContent(form, locale);
    const label = isJa ? "日本語" : "简体中文";

    return (
      <div className={cn("space-y-3", activeTab !== locale ? "hidden" : undefined)}>
        <div className="flex flex-wrap items-center gap-2">
          {sourceBadge(source, draftName || draftLoc || draftDesc)}
          {!hasContent ? (
            <span className="text-[11px] text-muted-foreground">번역 없음</span>
          ) : null}
        </div>
        {!hasContent ? (
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
            AI 번역 생성
          </Button>
        ) : null}
        <div>
          <label className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            매체명 ({label})
            {sourceBadge(source, draftName)}
          </label>
          <Input
            value={form[nameKey]}
            onChange={(e) => {
              setAiDraftFields((d) => ({ ...d, [nameKey]: false }));
              setForm((f) => ({ ...f, [nameKey]: e.target.value }));
            }}
          />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            위치 ({label})
            {sourceBadge(source, draftLoc)}
          </label>
          <Input
            value={form[locKey]}
            onChange={(e) => {
              setAiDraftFields((d) => ({ ...d, [locKey]: false }));
              setForm((f) => ({ ...f, [locKey]: e.target.value }));
            }}
          />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            설명 ({label})
            {sourceBadge(source, draftDesc)}
          </label>
          <Textarea
            rows={3}
            value={form[descKey]}
            onChange={(e) => {
              setAiDraftFields((d) => ({ ...d, [descKey]: false }));
              setForm((f) => ({ ...f, [descKey]: e.target.value }));
            }}
          />
        </div>
      </div>
    );
  };

  const tabBtn = (value: LocaleTab, label: string) => (
    <button
      key={value}
      type="button"
      className={cn(
        "rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
        activeTab === value
          ? "bg-background text-foreground shadow-sm ring-1 ring-border"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
      onClick={() => setActiveTab(value)}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">카탈로그 텍스트 (언어별)</p>
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
          AI 번역 (en/ja/zh)
        </Button>
      </div>
      {aiTranslateError ? (
        <p className="text-[11px] text-red-600">{aiTranslateError}</p>
      ) : (
        <p className="text-[10px] text-muted-foreground">
          AI 결과는 폼에만 채워집니다. 매체 저장 시 en 컬럼과 ja/zh 번역이 함께 반영되며, ja/zh는
          저장 시 검수완료(reviewed)로 기록됩니다.
        </p>
      )}
      <div className="mt-3">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted/50 p-1 sm:grid-cols-4">
          {tabBtn("ko", "한국어")}
          {tabBtn("en", "English")}
          {tabBtn("ja", "日本語")}
          {tabBtn("zh", "简体中文")}
        </div>
        <div className={cn("mt-3 space-y-3", activeTab !== "ko" ? "hidden" : undefined)}>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              매체명 (한국어) *
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={mediaNameKoPlaceholder(form.country)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              위치(주소) *
            </label>
            <Input
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">설명</label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
        </div>
        <div className={cn("mt-3 space-y-3", activeTab !== "en" ? "hidden" : undefined)}>
          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              매체명 (영어)
              {aiDraftFields.nameEn ? (
                <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-normal">
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
                <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-normal">
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
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              설명 (영어)
              {aiDraftFields.descriptionEn ? (
                <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-normal">
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
            />
          </div>
        </div>
        {renderCjkTab("ja")}
        {renderCjkTab("zh")}
      </div>
    </div>
  );
}
