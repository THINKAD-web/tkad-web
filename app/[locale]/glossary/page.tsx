import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import {
  GLOSSARY_CATEGORIES,
  GLOSSARY_TERMS,
  type GlossaryCategory,
  type GlossaryTerm,
} from "@/lib/glossary-data";
import { BookOpen } from "lucide-react";

type Props = { params: Promise<{ locale: string }> };

const CATEGORY_ORDER: GlossaryCategory[] = [
  "media-type",
  "metric",
  "process",
  "tech",
  "buying",
];

function groupByCategory(terms: GlossaryTerm[]) {
  const map = new Map<GlossaryCategory, GlossaryTerm[]>();
  for (const cat of CATEGORY_ORDER) map.set(cat, []);
  for (const t of terms) {
    map.get(t.category)?.push(t);
  }
  return map;
}

export default async function GlossaryPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";
  const grouped = groupByCategory(GLOSSARY_TERMS);

  return (
    <>
      {/* Hero */}
      <section className="bg-bx-black py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-accent">
            [ {isKo ? "용어집" : "GLOSSARY"} ]
          </p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-bx-white sm:text-4xl lg:text-5xl">
            <BookOpen
              className="mr-3 inline-block h-8 w-8 text-bx-accent"
              aria-hidden
            />
            {isKo ? "옥외광고 용어집" : "OOH Advertising Glossary"}
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-relaxed text-bx-white/80 sm:text-lg">
            {isKo
              ? `OOH(옥외광고) / DOOH / CPM / GRP 등 캠페인 기획·견적 시 자주 마주치는 ${GLOSSARY_TERMS.length}개 핵심 용어. 모든 정의는 업계 표준에 기반합니다.`
              : `${GLOSSARY_TERMS.length} essential terms for OOH campaign planning — billboard, DOOH, CPM, GRP, and more. All definitions follow industry standards.`}
          </p>
        </div>
      </section>

      {/* TOC — 카테고리 */}
      <section className="border-b-2 border-bx-black bg-bx-off py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
            [ {isKo ? "분류" : "CATEGORIES"} ]
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {CATEGORY_ORDER.map((cat) => {
              const count = grouped.get(cat)?.length ?? 0;
              if (count === 0) return null;
              const labels = GLOSSARY_CATEGORIES[cat];
              return (
                <li key={cat}>
                  <a
                    href={`#cat-${cat}`}
                    className="inline-flex items-center gap-2 border-2 border-bx-black bg-bx-white px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-black transition-colors hover:bg-bx-black hover:text-bx-white"
                  >
                    {isKo ? labels.ko : labels.en}
                    <span className="font-mono text-[10px] tabular-nums opacity-70">
                      {count}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* 카테고리별 용어 목록 */}
      <section className="bg-bx-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {CATEGORY_ORDER.map((cat) => {
            const items = grouped.get(cat) ?? [];
            if (items.length === 0) return null;
            const labels = GLOSSARY_CATEGORIES[cat];
            return (
              <div key={cat} id={`cat-${cat}`} className="mt-12 first:mt-0 scroll-mt-24">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                  [ {isKo ? labels.ko : labels.en} ]
                </p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-bx-black sm:text-3xl">
                  {isKo ? labels.ko : labels.en}
                </h2>
                <dl className="mt-6 space-y-0">
                  {items.map((t) => (
                    <div
                      key={t.id}
                      id={`term-${t.id}`}
                      className="-mt-[2px] border-2 border-bx-black bg-bx-white p-5 sm:p-6 scroll-mt-24"
                    >
                      <dt className="flex flex-wrap items-baseline gap-3">
                        <span className="text-xl font-extrabold tracking-tight text-bx-black sm:text-2xl">
                          {isKo ? t.term : (t.termEn || t.term)}
                        </span>
                        {t.termEn && t.termEn !== t.term && isKo ? (
                          <span className="font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-bx-gray-dim">
                            {t.termEn}
                          </span>
                        ) : null}
                        {!isKo && t.term !== t.termEn ? (
                          <span className="font-mono text-[12px] font-bold tracking-[0.04em] text-bx-gray-dim">
                            {t.term}
                          </span>
                        ) : null}
                      </dt>
                      {t.abbreviationFull ? (
                        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-bx-accent">
                          {`// `}
                          {t.abbreviationFull}
                        </p>
                      ) : null}
                      <dd className="mt-3 text-base leading-relaxed text-bx-black">
                        {isKo ? t.definitionKo : t.definitionEn}
                      </dd>
                      {t.aliases && t.aliases.length > 0 ? (
                        <p className="mt-3 font-mono text-[11px] tracking-tight text-bx-gray-dim">
                          {isKo ? "동의어 / 변형: " : "Aliases: "}
                          {t.aliases.join(" · ")}
                        </p>
                      ) : null}
                      {t.related && t.related.length > 0 ? (
                        <ul className="mt-4 flex flex-wrap gap-1.5">
                          {t.related.map((rid) => {
                            const r = GLOSSARY_TERMS.find((x) => x.id === rid);
                            if (!r) return null;
                            return (
                              <li key={rid}>
                                <a
                                  href={`#term-${rid}`}
                                  className="inline-flex items-center gap-1 border-2 border-bx-black bg-bx-off px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-black transition-colors hover:bg-bx-black hover:text-bx-white"
                                >
                                  → {isKo ? r.term : (r.termEn || r.term)}
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </dl>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t-2 border-bx-black bg-bx-black py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
            [ {isKo ? "다음 단계" : "NEXT"} ]
          </p>
          <h3 className="mt-3 text-2xl font-bold tracking-tight text-bx-white sm:text-3xl">
            {isKo
              ? "용어를 익혔다면, 지금 매체를 비교해보세요"
              : "Now you know the terms — start comparing media"}
          </h3>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/media"
              className="inline-flex items-center gap-2 border-2 border-bx-accent bg-bx-accent px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.22em] text-bx-white transition-colors hover:bg-bx-black hover:border-bx-black"
            >
              {isKo ? "매체 검색" : "Browse media"}
            </Link>
            <Link
              href="/planner"
              className="inline-flex items-center gap-2 border-2 border-bx-white bg-transparent px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.22em] text-bx-white transition-colors hover:bg-bx-white hover:text-bx-black"
            >
              {isKo ? "플래너 시작" : "Start planner"}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
