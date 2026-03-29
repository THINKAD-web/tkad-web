"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

function mapAdminLoginError(
  api: string | undefined,
  t: ReturnType<typeof useTranslations<"adminLogin">>,
): string {
  switch (api) {
    case "Admin login is not configured":
      return t("errorNotConfigured");
    case "Set ADMIN_SESSION_SECRET in production to enable admin login":
      return t("errorNoSessionSecret");
    case "Invalid credentials":
      return t("errorInvalidCredentials");
    case "Too many requests":
      return t("errorRateLimit");
    default:
      return api?.trim() ? api : t("errorGeneric");
  }
}

export function AdminLoginForm({ locale }: { locale: string }) {
  const t = useTranslations("adminLogin");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(mapAdminLoginError(data.error, t));
        return;
      }
      const from = searchParams.get("from");
      if (from?.startsWith(`/${locale}/admin`) && !from.includes("/login")) {
        router.push(from);
        router.refresh();
        return;
      }
      router.push(`/${locale}/admin`);
      router.refresh();
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-lg"
    >
      <div>
        <h1 className="text-xl font-bold text-navy">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="admin-user" className="text-xs font-medium text-slate-600">
          {t("username")}
        </label>
        <input
          id="admin-user"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-navy/20 focus:ring-2"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="admin-pass" className="text-xs font-medium text-slate-600">
          {t("password")}
        </label>
        <input
          id="admin-pass"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-navy/20 focus:ring-2"
        />
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-navy py-2.5 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-60"
      >
        {loading ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
