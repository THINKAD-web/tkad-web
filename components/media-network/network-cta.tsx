import { Link } from "@/i18n/navigation";
import { ArrowRight, MessageCircle, Zap } from "lucide-react";
import { NeonSection } from "@/components/landing/neon/neon-section";
import {
  NETWORK_NEON_CTA,
  NETWORK_NEON_CTA_SECONDARY,
  NETWORK_NEON_PANEL,
} from "@/components/media-network/network-neon-ui";
import { cn } from "@/lib/utils";

type Props = { isKo: boolean };

export function NetworkCTA({ isKo }: Props) {
  return (
    <NeonSection className="border-t-0 pb-16 sm:pb-20">
      <div
        className={cn(
          NETWORK_NEON_PANEL,
          "relative overflow-hidden border-violet-500/20 bg-gradient-to-br from-violet-50 via-white to-cyan-50 py-12 text-center dark:border-violet-500/25 dark:from-violet-600/10 dark:via-white/5 dark:to-cyan-600/10 sm:py-16",
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-10 tkad-neon-grid dark:opacity-25"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 tkad-neon-depth opacity-30 dark:opacity-60"
        />
        <h2 className="relative text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">
          {isKo ? "전국 네트워크 집행, 지금 시작하세요" : "Launch your nationwide network campaign"}
        </h2>
        <p className="relative mx-auto mt-3 max-w-lg text-sm text-gray-600 dark:text-white/55 sm:text-base">
          {isKo
            ? "전문가 상담 또는 즉시 견적 중 편한 방법을 선택하세요."
            : "Choose expert consultation or an instant quote—whichever fits you."}
        </p>
        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/contact?topic=network"
            className={cn(NETWORK_NEON_CTA_SECONDARY, "gap-2")}
          >
            <MessageCircle className="h-4 w-4" />
            {isKo ? "전문가 상담 받기" : "Talk to an expert"}
          </Link>
          <Link href="/quote?type=network" className={cn(NETWORK_NEON_CTA, "gap-2")}>
            <Zap className="h-4 w-4" />
            {isKo ? "즉시 견적받기" : "Get instant quote"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </NeonSection>
  );
}
