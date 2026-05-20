"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { MessageCircle, X } from "lucide-react";
import dynamic from "next/dynamic";
import { getSupportHoursStatus } from "@/lib/support-chat-hours";
import { cn } from "@/lib/utils";
import { SupportChatMenu } from "@/components/support/support-chat-menu";

const SupportAiChatModal = dynamic(
  () =>
    import("@/components/support/support-ai-chat-modal").then(
      (m) => m.SupportAiChatModal,
    ),
  { ssr: false },
);

type Props = {
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
};

export function SupportChatWidget({ menuOpen, onMenuOpenChange }: Props) {
  const t = useTranslations("supportChat");
  const [aiOpen, setAiOpen] = useState(false);
  const [hoursTick, setHoursTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setHoursTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const hours = useMemo(
    () => getSupportHoursStatus(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh each minute
    [hoursTick],
  );

  const toggleMenu = () => {
    if (menuOpen) {
      onMenuOpenChange(false);
    } else {
      setAiOpen(false);
      onMenuOpenChange(true);
    }
  };

  return (
    <>
      <SupportAiChatModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
      />

      {menuOpen ? (
        <SupportChatMenu
          open={menuOpen}
          onClose={() => onMenuOpenChange(false)}
          hours={hours}
          onOpenAi={() => setAiOpen(true)}
        />
      ) : null}

      <button
        type="button"
        onClick={toggleMenu}
        aria-expanded={menuOpen}
        aria-haspopup="dialog"
        className={cn(
          "relative flex h-11 w-full items-center justify-center rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/45",
          menuOpen
            ? "bg-white/15 text-white ring-2 ring-white/25"
            : "bg-[linear-gradient(135deg,rgba(168,85,247,0.9),rgba(34,211,238,0.9))] text-white shadow-md shadow-violet-500/25 hover:brightness-110",
        )}
        aria-label={menuOpen ? t("close") : t("openMenu")}
        title={menuOpen ? t("close") : t("openMenu")}
      >
        {hours.isOpen ? (
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]"
            aria-hidden
          />
        ) : null}
        {menuOpen ? (
          <X className="h-4 w-4" strokeWidth={2.25} />
        ) : (
          <MessageCircle className="h-4 w-4" strokeWidth={2.25} />
        )}
      </button>
    </>
  );
}
