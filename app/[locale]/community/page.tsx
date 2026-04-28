import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { pageAlternates } from "@/lib/seo";
import { buildBreadcrumbJsonLd } from "@/lib/structured-data";
import { Users } from "lucide-react";
import { COMMUNITY_CATEGORIES, COMMUNITY_CATEGORY_LABELS } from "@/lib/community/types";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo ? "광고 커뮤니티" : "Advertising Community";
  const description = isKo
    ? "OOH 광고주·매체사·마케터의 정보 교류 공간 — Q&A · 매체 후기 · 매체 추천."
    : "Information-sharing space for OOH advertisers, media operators, and marketers — Q&A, reviews, recommendations.";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/community"),
    openGraph: { title, description, type: "website" },
    // Phase 3a 단계 — UI 없이 정책 페이지만 indexable. UI 머지 시 noindex 해제.
    robots: { index: false, follow: false },
  };
}

/**
 * /community 랜딩 — Phase 3a 단계의 placeholder.
 * Phase 3b (UI) 머지 시 실제 게시판 목록으로 교체 예정.
 */
export default async function CommunityPlaceholderPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";

  const breadcrumb = buildBreadcrumbJsonLd(locale, [
    { name: isKo ? "홈" : "Home", path: "" },
    { name: isKo ? "커뮤니티" : "Community", path: "/community" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <section className="bg-bx-black py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-accent">
            [ {isKo ? "곧 출시" : "COMING SOON"} ]
          </p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-bx-white sm:text-4xl lg:text-5xl">
            <Users className="mr-3 inline-block h-8 w-8 text-bx-accent" aria-hidden />
            {isKo ? "광고 소통 커뮤니티" : "Advertising Community"}
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-relaxed text-bx-white/80 sm:text-lg">
            {isKo
              ? "OOH 광고주 · 매체사 · 마케터의 정보 교류 공간이 곧 오픈됩니다. 데이터·API 인프라 준비 완료 — UI 작업 진행 중입니다."
              : "Coming soon — a space for OOH advertisers, media operators, and marketers to share. Data + API infrastructure complete; UI in progress."}
          </p>
        </div>
      </section>

      <section className="bg-bx-white py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
            [ {isKo ? "준비 중인 카테고리" : "UPCOMING CATEGORIES"} ]
          </p>
          <ul className="mt-6 grid gap-0 sm:grid-cols-3">
            {COMMUNITY_CATEGORIES.map((cat) => {
              const labels = COMMUNITY_CATEGORY_LABELS[cat];
              return (
                <li
                  key={cat}
                  className="-mt-[2px] -ml-[2px] border-2 border-bx-black bg-bx-white p-6"
                >
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                    [ {isKo ? labels.ko : labels.en} ]
                  </p>
                  <h2 className="mt-3 text-xl font-bold tracking-tight text-bx-black">
                    {isKo ? labels.ko : labels.en}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-bx-gray-dim">
                    {isKo ? labels.description.ko : labels.description.en}
                  </p>
                </li>
              );
            })}
          </ul>

          <div className="mt-12 border-2 border-bx-black bg-bx-off p-6">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
              [ {isKo ? "운영 정책" : "POLICY"} ]
            </p>
            <p className="mt-2 text-sm leading-relaxed text-bx-black">
              {isKo
                ? "오픈 전 운영 정책을 미리 확인할 수 있습니다."
                : "Read the community policy before launch."}
            </p>
            <Link
              href="/community/policy"
              className="mt-4 inline-flex items-center gap-2 border-2 border-bx-black bg-bx-black px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-white transition-colors hover:bg-bx-accent hover:border-bx-accent"
            >
              {isKo ? "정책 보기" : "View policy"} →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
