"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  ArrowLeft,
  Copy,
  KeyRound,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { FullPageSpinner } from "@/components/ui/spinner";
import { useAppToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";

type ApiKeyRow = {
  id: string;
  name: string;
  maskedKey: string;
  plan: string;
  monthlyUsage: number;
  monthlyLimit: number | null;
  usageMonth: string;
  lastUsedAt: string | null;
  isActive: boolean;
  createdAt: string;
};

const glassCard =
  "rounded-2xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur";

const inputCls =
  "h-11 w-full rounded-xl border dark:border-white/12 border-gray-200 dark:bg-black bg-white bg-white/30 px-4 font-mono text-sm dark:text-white text-gray-900 placeholder:dark:text-white text-gray-400 outline-none focus:dark:border-white/20 border-gray-300 focus:ring-2 focus:ring-white/10";

const PLAN_LABEL: Record<string, { ko: string; en: string }> = {
  FREE: { ko: "Free (월 1,000회)", en: "Free (1k/mo)" },
  PRO: { ko: "Pro (월 10,000회)", en: "Pro (10k/mo)" },
  ENTERPRISE: { ko: "Enterprise (무제한)", en: "Enterprise" },
};

export function MyApiKeysPageClient() {
  const router = useRouter();
  const locale = useLocale();
  const isKo = locale === "ko";
  const toast = useAppToast();

  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/my/api-keys", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      router.replace("/login?redirect=/my/api-keys");
      return;
    }
    setKeys(json.data.keys as ApiKeyRow[]);
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function createKey(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/my/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error?.message ?? (isKo ? "발급 실패" : "Failed"));
        return;
      }
      setNewSecret(json.data.secret as string);
      setName("");
      await load();
      toast.success(isKo ? "API 키가 발급되었습니다." : "API key created.");
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: string) {
    if (!confirm(isKo ? "이 API 키를 삭제할까요?" : "Revoke this API key?")) {
      return;
    }
    setRevokingId(id);
    try {
      const res = await fetch(`/api/my/api-keys/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(isKo ? "삭제 실패" : "Revoke failed");
        return;
      }
      await load();
      toast.success(isKo ? "키가 삭제되었습니다." : "Key revoked.");
    } finally {
      setRevokingId(null);
    }
  }

  async function copySecret() {
    if (!newSecret) return;
    await navigator.clipboard.writeText(newSecret);
    toast.success(isKo ? "클립보드에 복사했습니다." : "Copied to clipboard.");
  }

  if (loading) {
    return (
      <HomeLandingDayNight>
        <FullPageSpinner />
      </HomeLandingDayNight>
    );
  }

  return (
    <HomeLandingDayNight>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <Link
          href="/my"
          className="mb-6 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest dark:text-white text-gray-500 hover:dark:text-white text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {isKo ? "마이페이지" : "My hub"}
        </Link>

        <div className="mb-8 flex items-start gap-3">
          <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-3">
            <KeyRound className="h-6 w-6 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold dark:text-white text-gray-900">
              {isKo ? "API 키" : "API keys"}
            </h1>
            <p className="mt-1 text-sm dark:text-white text-gray-500">
              {isKo
                ? "대행사 툴에서 싱커드 매체 DB를 연동할 때 사용합니다."
                : "Use these keys to integrate Synced media in your agency tools."}
            </p>
            <Link
              href="/developers"
              className="mt-2 inline-block text-sm text-cyan-300 hover:underline"
            >
              {isKo ? "API 문서 보기 →" : "View API docs →"}
            </Link>
          </div>
        </div>

        {newSecret ? (
          <div className={cn(glassCard, "mb-6 border-cyan-400/40")}>
            <p className="text-sm font-medium text-cyan-200">
              {isKo
                ? "새 키가 발급되었습니다. 아래 값은 다시 표시되지 않습니다."
                : "New key issued. Copy it now — it won't be shown again."}
            </p>
            <code className="mt-3 block break-all rounded-lg dark:bg-black bg-white dark:bg-white/5 bg-gray-500 p-3 font-mono text-xs dark:text-white text-gray-900">
              {newSecret}
            </code>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copySecret()}
                className="inline-flex items-center gap-2 rounded-lg border dark:border-white/20 border-gray-300 px-3 py-2 text-sm dark:text-white text-gray-900 hover:dark:bg-white/10 bg-gray-100"
              >
                <Copy className="h-4 w-4" />
                {isKo ? "복사" : "Copy"}
              </button>
              <button
                type="button"
                onClick={() => setNewSecret(null)}
                className="rounded-lg px-3 py-2 text-sm dark:text-white text-gray-500 hover:dark:text-white text-gray-900"
              >
                {isKo ? "닫기" : "Dismiss"}
              </button>
            </div>
          </div>
        ) : null}

        <form onSubmit={createKey} className={cn(glassCard, "mb-6")}>
          <h2 className="text-sm font-semibold dark:text-white text-gray-900">
            {isKo ? "새 API 키 발급" : "Create API key"}
          </h2>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              className={inputCls}
              placeholder={isKo ? "키 이름 (예: 사내 CRM)" : "Key name"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
            />
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 font-mono text-sm font-bold text-black hover:bg-cyan-400 disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {isKo ? "발급" : "Create"}
            </button>
          </div>
        </form>

        <div className="space-y-3">
          {keys.length === 0 ? (
            <p className={cn(glassCard, "text-center text-sm dark:text-white text-gray-400")}>
              {isKo ? "발급된 API 키가 없습니다." : "No API keys yet."}
            </p>
          ) : (
            keys.map((k) => (
              <div key={k.id} className={glassCard}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium dark:text-white text-gray-900">{k.name}</p>
                    <p className="mt-1 font-mono text-xs dark:text-white text-gray-600">
                      {k.maskedKey}
                    </p>
                    <p className="mt-2 text-xs dark:text-white text-gray-400">
                      {isKo ? "플랜" : "Plan"}:{" "}
                      {PLAN_LABEL[k.plan]?.[isKo ? "ko" : "en"] ?? k.plan}
                    </p>
                    <p className="mt-1 text-xs text-cyan-200/90">
                      {isKo ? "이번 달" : "This month"}: {k.monthlyUsage}
                      {k.monthlyLimit != null
                        ? ` / ${k.monthlyLimit}`
                        : ` (${isKo ? "무제한" : "unlimited"})`}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={revokingId === k.id}
                    onClick={() => void revokeKey(k.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-400/30 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10"
                  >
                    {revokingId === k.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    {isKo ? "삭제" : "Revoke"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </HomeLandingDayNight>
  );
}
