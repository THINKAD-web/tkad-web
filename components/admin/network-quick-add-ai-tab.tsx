"use client";

import { useState, useCallback } from "react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { buildNetworkCreateBody, parseNetworkQuickAddJson } from "@/lib/network-quick-add";

const PLACEHOLDER_KO = `강남/판교/송도 주요 아파트 엘리베이터에
디지털 광고판 설치. 한 달에 50대 패키지면
1500만원, 100대면 2800만원 정도.
입주민들이 오가면서 보는 거라 노출 좋음.`;

const PLACEHOLDER_EN = `Digital panels in apartment elevators across Gangnam, Pangyo, and Songdo.
About ₩15M/month for 50 units, ₩28M for 100 units.
Strong exposure along resident traffic paths.`;

type Props = {
  isEn: boolean;
  submitting: boolean;
  onRegister: (body: Record<string, unknown>) => Promise<void>;
  onEditJson: (json: string) => void;
};

export function NetworkQuickAddAiTab({
  isEn,
  submitting,
  onRegister,
  onEditJson,
}: Props) {
  const [description, setDescription] = useState("");
  const [locationHints, setLocationHints] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedJson, setGeneratedJson] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);

  const parsePreview = generatedJson
    ? parseNetworkQuickAddJson(generatedJson)
    : null;

  const generate = useCallback(async () => {
    setError(null);
    setGenerating(true);
    setGeneratedJson(null);
    setModel(null);
    try {
      const res = await fetch("/api/admin/networks/ai-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          locationHints: locationHints.trim() || undefined,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        json?: string;
        model?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(j.error ?? (isEn ? "AI generation failed" : "AI 생성 실패"));
        return;
      }
      if (!j.json) {
        setError(isEn ? "Empty AI response" : "AI 응답이 비어 있습니다");
        return;
      }
      setGeneratedJson(j.json);
      setModel(j.model ?? null);
    } catch {
      setError(isEn ? "AI request failed" : "AI 요청 실패");
    } finally {
      setGenerating(false);
    }
  }, [description, locationHints, isEn]);

  const registerGenerated = useCallback(async () => {
    if (!parsePreview || !parsePreview.ok) return;
    const d = parsePreview.data;
    await onRegister(buildNetworkCreateBody(d));
  }, [parsePreview, onRegister]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-violet-600" />
            {isEn ? "Describe your network" : "AI로 작성"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            {isEn
              ? "Describe the network in plain language. AI will draft registration JSON (name, type, pricing, locations)."
              : "어떤 네트워크 매체인지 자유롭게 설명해주세요. AI가 등록 JSON을 자동 작성합니다."}
          </p>
          <Textarea
            rows={10}
            className="text-sm leading-relaxed"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={isEn ? PLACEHOLDER_EN : PLACEHOLDER_KO}
          />
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700">
              {isEn
                ? "Location hints (optional)"
                : "지역 힌트 (선택, 쉼표로 구분)"}
            </label>
            <Input
              value={locationHints}
              onChange={(e) => setLocationHints(e.target.value)}
              placeholder={
                isEn ? "e.g. Gangnam, Pangyo, Songdo" : "예: 강남, 판교, 송도"
              }
            />
            <p className="text-xs text-slate-500">
              {isEn
                ? "AI creates representative coordinates per area. You can add precise sites later."
                : "입력한 지역마다 대표 좌표 지점을 생성합니다. 정확한 지점은 나중에 추가해도 됩니다."}
            </p>
          </div>
          <Button
            type="button"
            onClick={generate}
            disabled={generating || !description.trim()}
          >
            {generating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            {isEn ? "Generate JSON with AI" : "AI로 JSON 생성"}
          </Button>
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : null}
        </CardContent>
      </Card>

      {generatedJson ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isEn ? "Generated JSON preview" : "생성된 JSON 미리보기"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {model ? (
              <p className="text-xs text-slate-500">model: {model}</p>
            ) : null}
            <Textarea
              readOnly
              rows={16}
              className="font-mono text-xs"
              value={generatedJson}
            />
            {parsePreview && !parsePreview.ok ? (
              <p className="text-sm text-red-600">{parsePreview.error}</p>
            ) : null}
            {parsePreview && parsePreview.ok ? (
              <p className="text-sm text-slate-600">
                {isEn ? "OK:" : "확인:"}{" "}
                <span className="font-medium">{parsePreview.data.name}</span>
                {" · "}
                {parsePreview.data.type}
                {" · "}
                {parsePreview.data.locations.length}{" "}
                {isEn ? "locations" : "지점"}
                {parsePreview.data.packageOptions &&
                Array.isArray(parsePreview.data.packageOptions) ? (
                  <>
                    {" · "}
                    {isEn ? "packages:" : "패키지:"}{" "}
                    {(
                      parsePreview.data.packageOptions as Array<{
                        units: number;
                        price: number;
                      }>
                    )
                      .map((p) => `${p.units}→${p.price}만`)
                      .join(", ")}
                  </>
                ) : null}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={submitting || !parsePreview?.ok}
                onClick={registerGenerated}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isEn ? "Register as-is" : "이대로 등록"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!generatedJson}
                onClick={() => onEditJson(generatedJson)}
              >
                {isEn ? "Edit in JSON tab" : "수정하기"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
