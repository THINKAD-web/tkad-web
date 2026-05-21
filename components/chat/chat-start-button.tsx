"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { MessageCircle } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import { useToast } from "@/components/toast-provider";

type Props = {
  mediaId: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function ChatStartButton({
  mediaId,
  variant = "primary",
  size = "sm",
  className,
}: Props) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function startChat() {
    setLoading(true);
    try {
      const res = await fetch("/api/chat/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId, locale }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        if (res.status === 401) {
          router.push(`/login?redirect=/media/${encodeURIComponent(mediaId)}`);
          return;
        }
        toast(
          "error",
          json.error?.message ?? t("startError"),
        );
        return;
      }
      router.push(json.data.href as string);
    } catch {
      toast("error", t("startError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <BtnBlock
      type="button"
      onClick={() => void startChat()}
      variant={variant}
      size={size}
      disabled={loading}
      className={className}
    >
      <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
      {loading ? t("starting") : t("inquireThisMedia")}
    </BtnBlock>
  );
}
