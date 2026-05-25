export function HomeTrustBar() {
  const stats = [
    { value: "500+", label: "검증 매체" },
    { value: "443+", label: "활성 브랜드" },
    { value: "24H", label: "평균 응답" },
  ];

  const partners = [
    "SAMSUNG",
    "HYUNDAI",
    "LG",
    "KAKAO",
    "NAVER",
    "CJ",
    "LOTTE",
  ];

  return (
    <div className="border-t border-gray-100 px-4 py-6 dark:border-white/5">
      <div className="mb-6 grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stat.value}
            </p>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-white/40">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <div className="scrollbar-hide flex gap-6 overflow-x-auto pb-1">
        {partners.map((p) => (
          <span
            key={p}
            className="shrink-0 text-sm font-bold tracking-wider text-gray-300 dark:text-white/20"
          >
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}
