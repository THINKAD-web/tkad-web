import Link from "next/link";
import { ImageOff, Link2 } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminHealthHubPage({ params }: Props) {
  const { locale } = await params;
  const prefix = `/${locale}/admin`;

  return (
    <div className="space-y-8 p-6">
      <header>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          [ OPS / HEALTH ]
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">운영 헬스체크</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          깨진 링크·이미지를 스캔하고 오픈 전 품질을 점합니다.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href={`${prefix}/health/links`}
          className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card/40 p-5 transition-colors hover:border-primary/30"
        >
          <Link2 className="mt-0.5 h-8 w-8 text-primary" aria-hidden />
          <div>
            <h2 className="font-bold">링크 헬스</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              내부 URL fetch — 404·500·리다이렉트 목록
            </p>
          </div>
        </Link>
        <Link
          href={`${prefix}`}
          className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card/40 p-5 transition-colors hover:border-primary/30"
        >
          <ImageOff className="mt-0.5 h-8 w-8 text-amber-500" aria-hidden />
          <div>
            <h2 className="font-bold">매체 썸네일</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              어드민 대시보드 Media thumbnail health 카드
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
