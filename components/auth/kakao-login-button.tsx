"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

type Props = {
  className?: string;
};

export function KakaoLoginButton({ className }: Props) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const search = useSearchParams();
  const redirect = search.get("redirect") || "/my";
  const [loading, setLoading] = useState(false);

  function handleKakaoLogin() {
    setLoading(true);
    const safeRedirect = redirect.startsWith("/") ? redirect : `/${redirect}`;
    const params = new URLSearchParams({
      redirect: safeRedirect,
      locale,
    });
    window.location.href = `/api/auth/kakao/redirect?${params.toString()}`;
  }

  return (
    <button
      type="button"
      onClick={handleKakaoLogin}
      disabled={loading}
      className={
        className ??
        "flex h-12 w-full items-center justify-center gap-2 rounded-[18px] border border-[#FEE500]/40 bg-[#FEE500] px-4 font-mono text-sm font-bold text-[#191600] shadow-[0_12px_40px_rgba(254,229,0,0.22)] transition-transform hover:-translate-y-0.5 hover:opacity-95 disabled:opacity-70"
      }
    >
      <span
        aria-hidden
        className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#191600] text-[10px] font-black text-[#FEE500]"
      >
        K
      </span>
      {loading ? "카카오 연결 중…" : t("kakaoLogin")}
    </button>
  );
}
