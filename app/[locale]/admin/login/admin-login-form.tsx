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
      className="w-full max-w-sm space-y-4"
    >
      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          [ ADMIN ACCESS ]
        </p>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-foreground">
          {t("title")}
        </h1>
        <p className="mt-1 font-mono text-[11px] leading-relaxed tracking-tight text-muted-foreground">
          {`// `}{t("subtitle")}
        </p>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="admin-user"
          className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground"
        >
          {t("username")}
        </label>
        <input
          id="admin-user"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="tkad-auth-input h-11 w-full rounded-[18px] border border-border/70 bg-card/80 px-4 text-sm font-semibold text-foreground shadow-sm backdrop-blur outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="admin-pass"
          className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground"
        >
          {t("password")}
        </label>
        <input
          id="admin-pass"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="tkad-auth-input h-11 w-full rounded-[18px] border border-border/70 bg-card/80 px-4 text-sm font-semibold text-foreground shadow-sm backdrop-blur outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        />
      </div>

      {error ? (
        <p
          className="rounded-[18px] border border-border/70 bg-card/80 px-4 py-3 font-mono text-[11px] font-black uppercase tracking-[0.12em] text-foreground shadow-sm backdrop-blur"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-[18px] border dark:border-white/12 border-gray-200 bg-[linear-gradient(135deg,rgba(34,211,238,0.95)_0%,rgba(168,85,247,0.92)_52%,rgba(236,72,153,0.88)_100%)] py-3 font-mono text-[11px] font-black uppercase tracking-[0.22em] dark:text-white text-gray-900 shadow-[0_18px_60px_rgba(0,0,0,0.35)] transition-colors hover:brightness-105 disabled:opacity-60"
      >
        {loading ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
