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
    <li className="group relative -mt-[2px] -ml-[2px] flex gap-3 border-2 border-border bg-card p-3 transition-colors hover:bg-muted">
      <Link
        href={`/media/${item.id}`}
        className="absolute inset-0"
        aria-label={`${item.name} 상세 보기`}
      />
      {item.image ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={item.image}
          alt=""
          className="pointer-events-none relative h-20 w-20 flex-shrink-0 border-2 border-border object-cover grayscale transition-all duration-300 group-hover:grayscale-0"
        />
      ) : (
        <div className="relative h-20 w-20 flex-shrink-0 border-2 border-border bg-muted" />
      )}
      <div className="relative min-w-0 flex-1">
        <div className="truncate text-sm font-bold tracking-tight text-foreground group-hover:text-accent">
          {item.name}
        </div>
        <div className="mt-1 truncate font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {`// `}{item.region} · {item.type}
        </div>
        <div className="mt-2 font-mono text-sm font-bold tabular-nums text-accent">
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
          className="relative h-8 w-8 self-start border-2 border-border bg-card text-foreground transition-colors hover:bg-accent hover:text-background"
          aria-label="제거"
        >
          <X className="mx-auto h-4 w-4" />
        </button>
      )}
    </li>
  );
}
