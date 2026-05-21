import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { pageAlternates, siteUrl } from "@/lib/seo";
import {
  DEVELOPERS_BASE_URL,
  DEVELOPERS_ENDPOINTS,
  DEVELOPERS_PLANS,
} from "@/lib/developers-docs-content";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";
import { Code2, KeyRound, Shield, Zap } from "lucide-react";

type Props = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo
    ? "개발자 API · 싱커드 매체 연동"
    : "Developer API · Synced media";
  const description = isKo
    ? "대행사·파트너용 REST API. 매체 목록, 상세, 가용 캘린더를 API 키로 조회하세요."
    : "Partner REST API for media list, detail, and availability.";

  return {
    title,
    description,
    alternates: pageAlternates(locale, "/developers"),
    openGraph: { title, description, type: "website" },
  };
}

export default async function DevelopersPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";
  const base = DEVELOPERS_BASE_URL || siteUrl;
  const exampleKey = "tkad_sk_your_secret_key_here";

  return (
    <HomeLandingDayNight>
      <NeonSection className="!py-16 md:!py-24">
        <NeonSectionHead
          number="01"
          kicker={isKo ? "B2B API" : "B2B API"}
          title={
            isKo
              ? "싱커드 매체 DB를 당신의 툴에 연결하세요"
              : "Connect Synced media to your stack"
          }
          meta={
            isKo
              ? "매체 조회 · 가용성 · 예약 연동 REST v1"
              : "Media · availability · booking REST v1"
          }
        />
        <p className="-mt-4 max-w-2xl text-sm dark:text-white text-gray-600 sm:text-base">
          {isKo
            ? "대행사·미디어매체 툴에서 매체 조회·가용성 확인·예약 플로우를 자동화할 수 있는 공개 REST API입니다."
            : "Public REST API for agencies to query media, availability, and booking flows."}
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/my/api-keys"
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 font-mono text-sm font-bold text-black shadow-[0_0_24px_rgba(34,211,238,0.35)] hover:bg-cyan-300"
          >
            <KeyRound className="h-4 w-4" />
            {isKo ? "API 키 발급" : "Get API key"}
          </Link>
          <a
            href="#endpoints"
            className="inline-flex items-center gap-2 rounded-xl border dark:border-white/20 border-gray-300 px-6 py-3 font-mono text-sm dark:text-white text-gray-900 hover:dark:bg-white/5 bg-gray-50"
          >
            <Code2 className="h-4 w-4" />
            {isKo ? "엔드포인트" : "Endpoints"}
          </a>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Shield,
              title: isKo ? "Bearer 인증" : "Bearer auth",
              desc: isKo
                ? "Authorization: Bearer {apiKey} 헤더"
                : "Authorization: Bearer {apiKey}",
            },
            {
              icon: Zap,
              title: isKo ? "플랜별 한도" : "Plan limits",
              desc: isKo
                ? "Free 1k · Pro 10k · Enterprise 무제한 / 월"
                : "Free 1k · Pro 10k · Enterprise unlimited / mo",
            },
            {
              icon: Code2,
              title: isKo ? "DB 동기화" : "Live catalog",
              desc: isKo
                ? "운영 DB 기준 실시간 매체 데이터"
                : "Production DB-backed catalog",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50 p-5 backdrop-blur"
            >
              <Icon className="mb-3 h-6 w-6 text-cyan-300" />
              <h3 className="font-semibold dark:text-white text-gray-900">{title}</h3>
              <p className="mt-1 text-sm dark:text-white text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </NeonSection>

      <NeonSection className="!bg-[#080812] !py-14" id="auth">
        <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-300/80">
          {isKo ? "인증" : "Authentication"}
        </h2>
        <p className="mt-3 max-w-2xl text-sm dark:text-white text-gray-600">
          {isKo
            ? "모든 v1 요청에 API 키를 Bearer 토큰으로 전달합니다. 키는 /my/api-keys 에서 발급하며, 평문은 최초 1회만 표시됩니다."
            : "Send your API key as a Bearer token on every v1 request. Keys are issued at /my/api-keys and shown once."}
        </p>
        <pre className="mt-6 overflow-x-auto rounded-xl border border-cyan-500/20 dark:bg-black bg-white dark:bg-white/6 bg-gray-500 p-4 font-mono text-xs text-cyan-100">
          {`Authorization: Bearer ${exampleKey}`}
        </pre>
        <ul className="mt-6 flex flex-wrap gap-3 text-xs dark:text-white text-gray-500">
          {DEVELOPERS_PLANS.map((p) => (
            <li
              key={p.plan}
              className="rounded-full border dark:border-white/15 border-gray-200 px-3 py-1"
            >
              <span className="font-mono text-cyan-300">{p.plan}</span>{" "}
              {isKo ? p.limitKo : p.limitEn}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs dark:text-white text-gray-400">
          {isKo
            ? "월 한도 초과 시 HTTP 429 · 잘못된 키는 401"
            : "HTTP 429 when monthly limit exceeded · 401 for invalid keys"}
        </p>
      </NeonSection>

      <NeonSection className="!py-14" id="endpoints">
        <h2 className="text-xl font-bold dark:text-white text-gray-900">
          {isKo ? "엔드포인트" : "Endpoints"}
        </h2>
        <p className="mt-2 text-sm dark:text-white text-gray-500">
          Base URL:{" "}
          <code className="text-cyan-200">{base}</code>
        </p>

        <div className="mt-10 space-y-12">
          {DEVELOPERS_ENDPOINTS.map((ep) => (
            <article
              key={ep.id}
              className="rounded-2xl border dark:border-white/10 border-gray-200 bg-white/[0.03] p-6"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-xs font-bold text-emerald-300">
                  {ep.method}
                </span>
                <code className="font-mono text-sm dark:text-white text-gray-900">{ep.path}</code>
              </div>
              <h3 className="mt-3 text-lg font-semibold dark:text-white text-gray-900">
                {isKo ? ep.titleKo : ep.titleEn}
              </h3>
              <p className="mt-1 text-sm dark:text-white text-gray-500">
                {isKo ? ep.descKo : ep.descEn}
              </p>

              {ep.params.length > 0 ? (
                <div className="mt-4">
                  <p className="text-xs font-mono uppercase tracking-wider dark:text-white text-gray-400">
                    {isKo ? "쿼리 파라미터" : "Query params"}
                  </p>
                  <ul className="mt-2 space-y-1 text-sm dark:text-white text-gray-600">
                    {ep.params.map((p) => (
                      <li key={p.name}>
                        <code className="text-cyan-200">{p.name}</code>{" "}
                        <span className="dark:text-white text-gray-400">({p.type})</span> —{" "}
                        {p.descKo}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <p className="mt-6 text-xs font-mono uppercase tracking-wider dark:text-white text-gray-400">
                {isKo ? "응답 예시" : "Response example"}
              </p>
              <pre className="mt-2 overflow-x-auto rounded-xl border dark:border-white/10 border-gray-200 dark:bg-black bg-white dark:bg-white/5 bg-gray-500 p-4 font-mono text-xs leading-relaxed dark:text-white text-gray-800">
                {ep.exampleResponse}
              </pre>

              <p className="mt-6 text-xs font-mono uppercase tracking-wider dark:text-white text-gray-400">
                cURL
              </p>
              <pre className="mt-2 overflow-x-auto rounded-xl border border-cyan-500/15 dark:bg-black bg-white dark:bg-white/5 bg-gray-500 p-4 font-mono text-xs text-cyan-100/90">
                {ep.exampleCurl(base, exampleKey)}
              </pre>
            </article>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-8 text-center">
          <p className="text-lg font-semibold dark:text-white text-gray-900">
            {isKo ? "지금 API 키를 발급하세요" : "Issue your API key now"}
          </p>
          <p className="mt-2 text-sm dark:text-white text-gray-500">
            {isKo
              ? "로그인 후 마이페이지에서 키를 생성하고 바로 연동을 시작할 수 있습니다."
              : "Sign in, create a key in My page, and start integrating."}
          </p>
          <Link
            href="/my/api-keys"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-8 py-3 font-mono text-sm font-bold text-black hover:bg-cyan-300"
          >
            <KeyRound className="h-4 w-4" />
            {isKo ? "API 키 발급" : "Get API key"}
          </Link>
        </div>
      </NeonSection>
    </HomeLandingDayNight>
  );
}
