import { Link } from "@/i18n/navigation";
import { X } from "lucide-react";

export type MediaCardItem = {
  id: string;
  name: string;
  region: string;
  type: string;
  price: number;
  image: string | null;
};

function formatKRW(v: number): string {
  return `₩${new Intl.NumberFormat("ko-KR").format(v)}`;
}

export function MediaCard({
  item,
  onRemove,
}: {
  item: MediaCardItem;
  onRemove?: (id: string) => void;
}) {
  return (
    <li className="group relative bg-card border border-border/60 rounded-xl p-3 flex gap-3 hover:border-primary hover:shadow-md hover:-translate-y-px transition-all duration-200">
      <Link
        href={`/media/${item.id}`}
        className="absolute inset-0 rounded-xl"
        aria-label={`${item.name} 상세 보기`}
      />
      {item.image ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={item.image}
          alt=""
          className="relative w-20 h-20 object-cover rounded-lg flex-shrink-0 pointer-events-none"
        />
      ) : (
        <div className="relative w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0" />
      )}
      <div className="relative flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">
          {item.name}
        </div>
        <div className="text-xs text-gray-500 truncate mt-0.5">
          {item.region} · {item.type}
        </div>
        <div className="text-sm font-bold text-primary mt-1.5 tabular-nums">
          {formatKRW(item.price)}
        </div>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(item.id);
          }}
          className="relative self-start p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
          aria-label="제거"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </li>
  );
}
