"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { withSearchParamsSuspense } from "@/components/with-search-params-suspense";
import { authOAuthButtonClass } from "@/lib/auth/auth-ui-classes";

type Props = {
  className?: string;
};

function NaverLoginButtonInner({ className }: Props) {
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
        `${authOAuthButtonClass} border-[#03C75A]/40 bg-[#03C75A] text-white`
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

export const NaverLoginButton = withSearchParamsSuspense(NaverLoginButtonInner);
