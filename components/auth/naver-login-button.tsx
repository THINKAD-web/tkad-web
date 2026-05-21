"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

type Props = {
  className?: string;
};

export function NaverLoginButton({ className }: Props) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const search = useSearchParams();
  const redirect = search.get("redirect") || "/my";
  const [loading, setLoading] = useState(false);

  function handleNaverLogin() {
    setLoading(true);
    const safeRedirect = redirect.startsWith("/") ? redirect : `/${redirect}`;
    const params = new URLSearchParams({
      redirect: safeRedirect,
      locale,
    });
    window.location.href = `/api/auth/naver/redirect?${params.toString()}`;
  }

  return (
    <button
      type="button"
      onClick={handleNaverLogin}
      disabled={loading}
      className={
        className ??
        "flex h-12 w-full items-center justify-center gap-2 rounded-[18px] border border-[#03C75A]/50 bg-[#03C75A] px-4 font-mono text-sm font-bold dark:text-white text-gray-900 shadow-[0_12px_40px_rgba(3,199,90,0.22)] transition-transform hover:-translate-y-0.5 hover:opacity-95 disabled:opacity-70"
      }
    >
      <span
        aria-hidden
        className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-white text-[10px] font-black text-[#03C75A]"
      >
        N
      </span>
      {loading ? "네이버 연결 중…" : t("naverLogin")}
    </button>
  );
}
