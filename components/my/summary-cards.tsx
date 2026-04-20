import { Heart, Rocket, FileText } from "lucide-react";

type Props = {
  favorites: number;
  inProgress: number;
  totalQuotes: number;
};

const cards = [
  {
    key: "favorites" as const,
    label: "관심 매체",
    icon: Heart,
    accent: "from-rose-50 to-white",
    iconClass: "text-rose-500 bg-rose-100",
  },
  {
    key: "inProgress" as const,
    label: "진행 캠페인",
    icon: Rocket,
    accent: "from-amber-50 to-white",
    iconClass: "text-amber-600 bg-amber-100",
  },
  {
    key: "totalQuotes" as const,
    label: "전체 견적서",
    icon: FileText,
    accent: "from-indigo-50 to-white",
    iconClass: "text-indigo-600 bg-indigo-100",
  },
];

export function SummaryCards({ favorites, inProgress, totalQuotes }: Props) {
  const values = { favorites, inProgress, totalQuotes };
  return (
    <section className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.key}
            className={`bg-gradient-to-b ${c.accent} border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">{c.label}</span>
              <span className={`p-1.5 rounded-lg ${c.iconClass}`}>
                <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
              </span>
            </div>
            <div className="text-3xl font-bold text-gray-900 tabular-nums">
              {values[c.key]}
            </div>
          </div>
        );
      })}
    </section>
  );
}
