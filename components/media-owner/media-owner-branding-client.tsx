"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MediaOwnerPageLoader,
  ownerGlassCard,
  ownerInputCls,
} from "@/components/media-owner/media-owner-shell";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type Branding = {
  logoUrl: string | null;
  companyName: string | null;
  businessNumber: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  theme: "ORANGE" | "BLUE" | "VIOLET";
  autoMonthlyReport: boolean;
  autoReportEmail: string | null;
};

const THEMES = [
  { id: "ORANGE" as const, label: "THINKAD Orange", color: "#FF6600" },
  { id: "BLUE" as const, label: "Corporate Blue", color: "#2563EB" },
  { id: "VIOLET" as const, label: "Premium Violet", color: "#7C3AED" },
];

export default function MediaOwnerBrandingClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Branding>({
    logoUrl: null,
    companyName: null,
    businessNumber: null,
    contactPhone: null,
    contactEmail: null,
    theme: "ORANGE",
    autoMonthlyReport: false,
    autoReportEmail: null,
  });
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/media-owner/branding", { cache: "no-store" });
    const json = await res.json();
    if (json.ok && json.data.branding) {
      setForm((prev) => ({ ...prev, ...json.data.branding }));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/media-owner/branding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setSaving(false);
    setMsg(json.ok ? "저장했습니다." : "저장 실패");
  }

  if (loading) return <MediaOwnerPageLoader />;

  const themeColor = THEMES.find((t) => t.id === form.theme)?.color ?? "#FF6600";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold dark:text-white text-gray-900">보고서 브랜딩</h2>
        <p className="mt-1 text-sm dark:text-white text-gray-500">
          PRO: 로고 교체 · ENTERPRISE: 완전 화이트라벨
        </p>
      </div>

      <div className={`${ownerGlassCard} grid gap-4 md:grid-cols-2`}>
        <div>
          <label className="text-xs dark:text-white text-gray-400">로고 URL (PNG 200×60 권장)</label>
          <input
            className={`${ownerInputCls} mt-1`}
            value={form.logoUrl ?? ""}
            onChange={(e) => setForm({ ...form, logoUrl: e.target.value || null })}
          />
        </div>
        <div>
          <label className="text-xs dark:text-white text-gray-400">회사명</label>
          <input
            className={`${ownerInputCls} mt-1`}
            value={form.companyName ?? ""}
            onChange={(e) => setForm({ ...form, companyName: e.target.value || null })}
          />
        </div>
        <div>
          <label className="text-xs dark:text-white text-gray-400">사업자번호</label>
          <input
            className={`${ownerInputCls} mt-1`}
            value={form.businessNumber ?? ""}
            onChange={(e) =>
              setForm({ ...form, businessNumber: e.target.value || null })
            }
          />
        </div>
        <div>
          <label className="text-xs dark:text-white text-gray-400">연락처</label>
          <input
            className={`${ownerInputCls} mt-1`}
            value={form.contactPhone ?? ""}
            onChange={(e) => setForm({ ...form, contactPhone: e.target.value || null })}
          />
        </div>
        <div>
          <label className="text-xs dark:text-white text-gray-400">이메일</label>
          <input
            className={`${ownerInputCls} mt-1`}
            value={form.contactEmail ?? ""}
            onChange={(e) => setForm({ ...form, contactEmail: e.target.value || null })}
          />
        </div>
        <div>
          <label className="text-xs dark:text-white text-gray-400">컬러 테마</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setForm({ ...form, theme: t.id })}
                className={`rounded-lg border px-3 py-2 text-xs ${
                  form.theme === t.id ? "border-violet-400 dark:bg-white/10 bg-gray-100" : "dark:border-white/20 border-gray-300"
                }`}
              >
                <span
                  className="mr-2 inline-block h-3 w-3 rounded-full"
                  style={{ background: t.color }}
                />
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="flex items-center gap-2 text-sm dark:text-white text-gray-700">
            <input
              type="checkbox"
              checked={form.autoMonthlyReport}
              onChange={(e) =>
                setForm({ ...form, autoMonthlyReport: e.target.checked })
              }
            />
            매월 1일 자동 월간 보고서 이메일 받기
          </label>
          {form.autoMonthlyReport ? (
            <input
              className={`${ownerInputCls} mt-2`}
              placeholder="수신 이메일"
              value={form.autoReportEmail ?? ""}
              onChange={(e) =>
                setForm({ ...form, autoReportEmail: e.target.value || null })
              }
            />
          ) : null}
        </div>
      </div>

      <div className={`${ownerGlassCard}`}>
        <p className="text-xs dark:text-white text-gray-400">미리보기</p>
        <div
          className="mt-3 rounded-xl p-6 dark:text-white text-gray-900"
          style={{ background: `linear-gradient(135deg, ${themeColor}, #111)` }}
        >
          {form.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.logoUrl} alt="" className="mb-4 h-8 object-contain" />
          ) : (
            <p className="text-lg font-bold">{form.companyName ?? "회사 로고"}</p>
          )}
          <p className="text-2xl font-bold">매체 스펙 시트</p>
          <p className="mt-2 text-sm opacity-80">샘플 매체 · 2026-05-21</p>
        </div>
      </div>

      {msg ? <p className="text-sm text-emerald-300">{msg}</p> : null}
      <Button type="button" disabled={saving} onClick={() => void save()}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        저장
      </Button>
    </div>
  );
}
