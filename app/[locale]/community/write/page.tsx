import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { pageAlternates } from "@/lib/seo";
import { ArrowLeft, PenLine } from "lucide-react";
import { CommunityWriteForm } from "@/components/community/write-form";

type Props = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo ? "글쓰기 — 광고 커뮤니티" : "Write — Community";
  const description = isKo
    ? "OOH 광고 / 매체에 대한 질문, 후기, 추천을 작성해주세요. 익명 또는 가입 사용자로 작성 가능."
    : "Post a question, review, or recommendation. Anonymous or signed-in.";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/community/write"),
    // 작성 폼은 인덱싱 X
    robots: { index: false, follow: false },
  };
}

export default async function CommunityWritePage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";

  return (
    <>
      {/* 상단 — 뒤로 */}
      <section className="border-b-2 border-border bg-muted py-4">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/community"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-accent hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            {isKo ? "커뮤니티 목록" : "Community list"}
          </Link>
        </div>
      </section>

      {/* Hero */}
      <section className="border-b-2 border-border bg-hero-void py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
            [ {isKo ? "글쓰기" : "NEW POST"} ]
          </p>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-hero-fg sm:text-3xl">
            <PenLine
              className="mr-3 inline-block h-7 w-7 text-accent"
              aria-hidden
            />
            {isKo ? "새 글 작성" : "New post"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-hero-fg/70">
            {isKo ? (
              <>
                작성 전{" "}
                <Link
                  href="/community/policy"
                  className="font-bold text-accent hover:text-background underline underline-offset-4"
                >
                  운영 정책
                </Link>{" "}
                을 확인해주세요. 광고 / 도배 / 명예훼손 / 개인정보 노출은 즉시
                숨김 처리됩니다.
              </>
            ) : (
              <>
                Please review the{" "}
                <Link
                  href="/community/policy"
                  className="font-bold text-accent hover:text-background underline underline-offset-4"
                >
                  community policy
                </Link>{" "}
                before posting. Spam, defamation, and personal info exposure are
                hidden immediately.
              </>
            )}
          </p>
        </div>
      </section>

      {/* 작성 폼 */}
      <section className="bg-card py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <CommunityWriteForm />
        </div>
      </section>
    </>
  );
}
