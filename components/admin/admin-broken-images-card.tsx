import Link from "next/link";
import { ImageOff } from "lucide-react";
import type { MediaImageHealthResult } from "@/lib/media-image-health";

type Props = {
  locale: string;
  result: MediaImageHealthResult;
};

export function AdminBrokenImagesCard({ locale, result }: Props) {
  const prefix = `/${locale}`;
  const { broken, scanned, checkedAt } = result;

  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
        <h2 className="flex items-center gap-2 font-display text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          <ImageOff className="h-4 w-4 text-amber-400/80" aria-hidden />
          [ Media thumbnail health ]
        </h2>
        <span className="text-[10px] text-muted-foreground">
          {new Date(checkedAt).toLocaleString("ko-KR")}
        </span>
      </div>

      <p className="border-b border-border/40 px-4 py-2 text-[11px] text-muted-foreground">
        {`// scanned ${scanned} · broken ${broken.length}`}
      </p>

      {broken.length === 0 ? (
        <p className="px-4 py-8 text-center font-display text-xs font-medium uppercase tracking-[0.16em] text-emerald-400/90">
          모든 썸네일 URL 응답 정상
        </p>
      ) : (
        <ul className="max-h-64 divide-y divide-border/50 overflow-y-auto">
          {broken.map((row) => (
            <li key={row.mediaId} className="px-4 py-3">
              <Link
                href={`${prefix}/admin/medias/${row.mediaId}/edit`}
                className="text-sm font-bold hover:underline"
              >
                {row.name}
              </Link>
              <p className="mt-1 truncate text-[10px] text-muted-foreground">
                {row.thumbnailUrl}
              </p>
              <p className="mt-1 text-[10px] text-amber-300">
                {row.status != null ? `HTTP ${row.status}` : "—"}
                {row.error ? ` · ${row.error}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
