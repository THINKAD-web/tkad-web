"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { withSearchParamsSuspense } from "@/components/with-search-params-suspense";
import { authOAuthButtonClass } from "@/lib/auth/auth-ui-classes";

type Props = {
  className?: string;
};

function KakaoLoginButtonInner({ className }: Props) {
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
        `${authOAuthButtonClass} border-[#FEE500]/40 bg-[#FEE500] text-[#191600]`
      }
    >
      <span
        aria-hidden
        className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#191600] tkad-type-note font-black text-[#FEE500]"
      >
        K
      </span>
      {loading ? "카카오 연결 중…" : t("kakaoLogin")}
    </button>
  );
}

export const KakaoLoginButton = withSearchParamsSuspense(KakaoLoginButtonInner);
