import { Link } from "@/i18n/navigation";
import { ArrowRight, MessageCircle, Package, Search, Sparkles } from "lucide-react";
import { CategoryButtonGrid } from "@/components/category/category-button-grid";
import {
  HOME_MEDIA_TYPE_CHIPS,
  HOME_MEDIA_TYPE_GRID,
  HOME_TARGET_CHIPS,
  HOME_TARGET_GRID,
} from "@/lib/category-grid-config";
import { cn } from "@/lib/utils";

type QuickEntryProps = { locale: string };

export function HomeQuickEntry({ locale }: QuickEntryProps) {
  const isKo = locale.startsWith("ko");

  const items = [
    {
      href: "/media",
      icon: Search,
      emoji: "🔍",
      label: isKo ? "매체 검색" : "Search media",
    },
    {
      href: "/planner",
      icon: Sparkles,
      emoji: "✨",
      label: isKo ? "AI 플래너" : "AI planner",
    },
    {
      href: "/media/packages",
      icon: Package,
      emoji: "📦",
      label: isKo ? "패키지" : "Packages",
    },
    {
      href: "/contact",
      icon: MessageCircle,
      emoji: "💬",
      label: isKo ? "견적 문의" : "Get a quote",
    },
  ] as const;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
        {isKo ? "무엇을 찾으세요?" : "What are you looking for?"}
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white p-5",
              "transition-all hover:-translate-y-0.5 hover:border-violet-400/40 hover:shadow-md",
              "dark:border-white/12 dark:bg-white/5",
            )}
          >
            <span className="text-3xl" aria-hidden>
              {item.emoji}
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

type CategorySectionProps = { locale: string };

function CategoryChipRow({
  title,
  items,
  locale,
}: {
  title: string;
  items: typeof HOME_MEDIA_TYPE_CHIPS;
  locale: string;
}) {
  const isKo = locale.startsWith("ko");

  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-gray-500 dark:text-white/50">
        {title}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <Link
            key={item.slug}
            href={item.href}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-800 transition-colors hover:border-violet-400/50 dark:border-white/12 dark:bg-white/5 dark:text-white"
          >
            <span aria-hidden>{item.icon}</span>
            {isKo ? item.labelKo : item.labelEn}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function HomeCategorySection({ locale }: CategorySectionProps) {
  const isKo = locale.startsWith("ko");

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <CategoryChipRow
        title={isKo ? "매체 유형별로 찾기" : "Browse by media type"}
        items={HOME_MEDIA_TYPE_CHIPS}
        locale={locale}
      />
      <div className="mt-5">
        <CategoryChipRow
          title={isKo ? "목적별로 찾기" : "Browse by goal"}
          items={HOME_TARGET_CHIPS}
          locale={locale}
        />
      </div>

      <div className="mt-8 space-y-8 md:hidden">
        <CategoryButtonGrid
          items={HOME_MEDIA_TYPE_GRID}
          locale={locale}
          title={isKo ? "매체 유형" : "Media types"}
        />
        <CategoryButtonGrid
          items={HOME_TARGET_GRID}
          locale={locale}
          title={isKo ? "캠페인 목적" : "Campaign goals"}
        />
      </div>

      <div className="mt-8 hidden space-y-8 md:block">
        <CategoryButtonGrid
          items={HOME_MEDIA_TYPE_GRID}
          locale={locale}
          title={isKo ? "매체 유형" : "Media types"}
          layout="row"
        />
        <CategoryButtonGrid
          items={HOME_TARGET_GRID}
          locale={locale}
          title={isKo ? "캠페인 목적" : "Campaign goals"}
          layout="row"
        />
      </div>
    </section>
  );
}

export function HomeTrustStrip({ locale }: { locale: string }) {
  const isKo = locale.startsWith("ko");
  const partners = ["Samsung", "Hyundai", "LG", "Kakao", "Naver", "CJ"];

  return (
    <section className="border-t border-gray-200 bg-gray-50 px-4 py-10 dark:border-white/10 dark:bg-white/[0.02] sm:px-6">
      <div className="mx-auto max-w-6xl text-center">
        <p className="text-2xl font-black tabular-nums tracking-tight text-gray-900 dark:text-white sm:text-3xl">
          500+ {isKo ? "매체" : "media"}
          <span className="mx-2 text-gray-300 dark:text-white/20">·</span>
          24h {isKo ? "응답" : "response"}
        </p>
        <p className="mt-2 text-sm text-gray-500 dark:text-white/50">
          {isKo
            ? "검증된 전국 OOH 매체 · 빠른 견적 상담"
            : "Verified nationwide OOH · fast quote support"}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {partners.map((name) => (
            <span
              key={name}
              className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-white/35"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomePopularMediaHeader({
  locale,
}: {
  locale: string;
}) {
  const isKo = locale.startsWith("ko");

  return (
    <div className="mx-auto flex w-full max-w-6xl items-end justify-between gap-4 px-4 sm:px-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
        {isKo ? "이번 주 인기 매체" : "Popular this week"}
      </h2>
      <Link
        href="/media"
        className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-violet-600 dark:text-violet-300"
      >
        {isKo ? "전체 보기" : "View all"}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
