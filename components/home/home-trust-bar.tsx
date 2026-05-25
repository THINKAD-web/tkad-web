import { cn } from "@/lib/utils";

const PARTNERS = ["SAMSUNG", "HYUNDAI", "LG", "KAKAO", "NAVER"] as const;

type Props = { locale: string };

export function HomeTrustBar({ locale }: Props) {
  const isKo = locale.startsWith("ko");

  return (
    <section
      className="py-8"
      data-screenshot="home-trust-bar"
    >
      <div className="text-center">
        <p className="text-base font-black tabular-nums tracking-tight text-gray-900 dark:text-white sm:text-lg">
          {isKo ? "500+ 검증 매체" : "500+ verified media"}
          <span className="mx-2 text-gray-300 dark:text-white/20">/</span>
          {isKo ? "443+ 활성 브랜드" : "443+ active brands"}
          <span className="mx-2 text-gray-300 dark:text-white/20">/</span>
          {isKo ? "24H 응답" : "24h response"}
        </p>
      </div>
      <div
        className={cn(
          "mt-6 flex gap-8 overflow-x-auto pb-2",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {PARTNERS.map((name) => (
          <span
            key={name}
            className={cn(
              "shrink-0 text-sm font-bold tracking-widest grayscale",
              "opacity-20 transition hover:opacity-50",
              "dark:opacity-40 dark:hover:opacity-70",
              "text-gray-900 dark:text-white",
            )}
          >
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}
