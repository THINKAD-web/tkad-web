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
      className="w-full max-w-sm space-y-4 border-2 border-bx-black bg-bx-white p-8 dark:border-bx-white dark:bg-bx-black"
    >
      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
          [ ADMIN ACCESS ]
        </p>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-bx-black dark:text-bx-white">
          {t("title")}
        </h1>
        <p className="mt-1 font-mono text-[11px] leading-relaxed tracking-tight text-bx-gray-dim">
          {`// `}{t("subtitle")}
        </p>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="admin-user"
          className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-bx-black dark:text-bx-white"
        >
          {t("username")}
        </label>
        <input
          id="admin-user"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border-2 border-bx-black bg-bx-white px-3 py-2 text-sm text-bx-black outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-bx-accent dark:border-bx-white dark:bg-bx-black dark:text-bx-white"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="admin-pass"
          className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-bx-black dark:text-bx-white"
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
          className="w-full border-2 border-bx-black bg-bx-white px-3 py-2 text-sm text-bx-black outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-bx-accent dark:border-bx-white dark:bg-bx-black dark:text-bx-white"
        />
      </div>

      {error ? (
        <p className="border-2 border-bx-black bg-bx-accent px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-bx-white dark:border-bx-white" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full border-2 border-bx-black bg-bx-black py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-bx-white transition-colors hover:bg-bx-accent hover:border-bx-accent disabled:opacity-60 dark:border-bx-white dark:bg-bx-white dark:text-bx-black dark:hover:bg-bx-accent dark:hover:border-bx-accent dark:hover:text-bx-white"
      >
        {loading ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
