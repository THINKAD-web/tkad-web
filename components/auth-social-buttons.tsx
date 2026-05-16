"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type ProviderId = "kakao" | "naver";
type Provider = { id: ProviderId; label: string };

const PROVIDER_STYLES: Record<
  ProviderId,
  { label: string; emoji: string; cls: string }
> = {
  kakao: {
    label: "카카오로 시작하기",
    emoji: "💬",
    cls: "bg-[#FEE500] text-[#191919] hover:brightness-95",
  },
  naver: {
    label: "네이버로 시작하기",
    emoji: "N",
    cls: "bg-[#03C75A] text-white hover:brightness-95",
  },
};

export function AuthSocialButtons({
  redirect,
  className,
}: {
  redirect?: string;
  className?: string;
}) {
  const [providers, setProviders] = useState<Provider[] | null>(null);
  const params = useSearchParams();
  const oauthError = params.get("oauth_error");
  const effectiveRedirect = redirect || params.get("redirect") || "/my";

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/providers", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const list = (d?.data?.providers ?? []) as Provider[];
        setProviders(list);
      })
      .catch(() => {
        if (!cancelled) setProviders([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (providers === null) return null;
  if (providers.length === 0 && !oauthError) return null;

  return (
    <div className={className}>
      {oauthError ? (
        <div className="mb-3 rounded-[18px] border border-white/14 bg-black/35 px-3 py-2 font-mono text-[12px] tracking-tight text-white/85">
          {`// `}소셜 로그인에 실패했습니다 ({oauthError}). 다시 시도해주세요.
        </div>
      ) : null}

      {providers.length > 0 ? (
        <>
          <div className="my-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
            <div className="h-px flex-1 bg-white/12" />
            <span>OR</span>
            <div className="h-px flex-1 bg-white/12" />
          </div>
          <div className="flex flex-col gap-2">
            {providers.map((p) => {
              const style = PROVIDER_STYLES[p.id];
              if (!style) return null;
              const href = `/api/auth/oauth/${p.id}/start?redirect=${encodeURIComponent(effectiveRedirect)}`;
              return (
                <a
                  key={p.id}
                  href={href}
                  className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-[18px] border border-black/5 px-4 font-bold text-sm tracking-tight shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition-all hover:-translate-y-0.5 active:translate-y-0 ${style.cls}`}
                >
                  <span aria-hidden className="inline-flex h-5 w-5 items-center justify-center font-mono text-base font-black">
                    {style.emoji}
                  </span>
                  {style.label}
                </a>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
