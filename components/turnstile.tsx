"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { cn } from "@/lib/utils";

type Props = {
  onVerify: (token: string) => void;
  className?: string;
};

/**
 * Cloudflare Turnstile — `@marsidev/react-turnstile` wrapper.
 * Site key 미설정 시 렌더하지 않음 (로컬·프리뷰).
 */
export function TurnstileWidget({ onVerify, className }: Props) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  if (!siteKey) return null;

  return (
    <div className={cn("flex justify-center", className)}>
      <Turnstile
        siteKey={siteKey}
        onSuccess={(token) => onVerify(token)}
        onExpire={() => onVerify("")}
        onError={() => onVerify("")}
        options={{ theme: "light", size: "normal" }}
      />
    </div>
  );
}
