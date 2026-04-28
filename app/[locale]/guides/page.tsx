import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { listGuideMeta } from "@/lib/guides-data";
import { buildBreadcrumbJsonLd } from "@/lib/structured-data";
import { ArrowRight, BookText } from "lucide-react";

type Props = { params: Promise<{ locale: string }> };

export default async function GuidesIndexPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";
  const guides = listGuideMeta();
  const breadcrumb = buildBreadcrumbJsonLd(locale, [
    { name: isKo ? "홈" : "Home", path: "" },
    { name: isKo ? "가이드" : "Guides", path: "/guides" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <section className="bg-bx-black py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-accent">
            [ {isKo ? "가이드" : "GUIDES"} ]
          </p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-bx-white sm:text-4xl lg:text-5xl">
            <BookText
              className="mr-3 inline-block h-8 w-8 text-bx-accent"
              aria-hidden
            />
            {isKo ? "OOH 광고 집행 가이드" : "OOH Campaign Guides"}
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-relaxed text-bx-white/80 sm:text-lg">
            {isKo
              ? "지역 / 산업 / 매체 유형별 OOH 광고 집행 가이드. THINKAD 의 캠페인 데이터 기반."
              : "Region / industry / media-type OOH guides based on THINKAD campaign data."}
          </p>
        </div>
      </section>

      <section className="bg-bx-white py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {guides.length === 0 ? (
            <div className="border-2 border-bx-black bg-bx-off p-12 text-center">
              <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-bx-gray-dim">
                {`// `}
                {isKo ? "준비 중인 가이드가 없습니다." : "No guides available yet."}
              </p>
            </div>
          ) : (
            <ul className="grid gap-0 sm:grid-cols-2 lg:grid-cols-3">
              {guides.map((g) => (
                <li key={g.slug}>
                  <Link
                    href={`/guides/${g.slug}`}
                    className="-mt-[2px] -ml-[2px] flex h-full flex-col border-2 border-bx-black bg-bx-white p-6 transition-colors hover:bg-bx-black hover:text-bx-white"
                  >
                    {g.draft ? (
                      <span className="mb-3 inline-flex w-fit items-center border-2 border-bx-accent bg-bx-accent px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-white">
                        [ DRAFT ]
                      </span>
                    ) : null}
                    <h2 className="text-xl font-bold tracking-tight">{g.title}</h2>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-bx-gray-dim group-hover:text-bx-white/80">
                      {g.description}
                    </p>
                    <span className="mt-6 inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                      {isKo ? "읽기" : "Read"}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
