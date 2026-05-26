"use client";

import { Link } from "@/i18n/navigation";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";
import {
  neonCardClass,
  neonSubtitleClass,
} from "@/components/marketing/neon-page-shell";
import {
  DEVELOPERS_ENDPOINTS,
  DEVELOPERS_PLANS,
} from "@/lib/developers-docs-content";
import { cn } from "@/lib/utils";
import { Code2, KeyRound, Shield, Zap } from "lucide-react";

const codeBlockClass =
  "overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100 shadow-inner dark:border-cyan-500/20";

const inlineCodeClass = "font-mono text-cyan-700 dark:text-cyan-200";

type Props = {
  isKo: boolean;
  base: string;
  exampleKey: string;
};

export function DevelopersPageClient({ isKo, base, exampleKey }: Props) {
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
        <p className={cn("-mt-4 max-w-2xl sm:text-base", neonSubtitleClass)}>
          {isKo
            ? "대행사·미디어매체 툴에서 매체 조회·가용성 확인·예약 플로우를 자동화할 수 있는 공개 REST API입니다."
            : "Public REST API for agencies to query media, availability, and booking flows."}
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/my/api-keys"
            className="tkad-neon-cta-clean inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold shadow-[0_0_24px_rgba(34,211,238,0.25)]"
          >
            <KeyRound className="h-4 w-4" aria-hidden />
            {isKo ? "API 키 발급" : "Get API key"}
          </Link>
          <a
            href="#endpoints"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-gray-50 dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            <Code2 className="h-4 w-4" aria-hidden />
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
            <div key={title} className={cn(neonCardClass, "p-5 backdrop-blur-sm")}>
              <Icon
                className="mb-3 h-6 w-6 text-cyan-600 dark:text-cyan-300"
                aria-hidden
              />
              <h3 className="font-semibold text-foreground">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </NeonSection>

      <NeonSection className="!py-14" id="auth">
        <h2 className="font-display text-xs uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300/80">
          {isKo ? "인증" : "Authentication"}
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          {isKo
            ? "모든 v1 요청에 API 키를 Bearer 토큰으로 전달합니다. 키는 /my/api-keys 에서 발급하며, 평문은 최초 1회만 표시됩니다."
            : "Send your API key as a Bearer token on every v1 request. Keys are issued at /my/api-keys and shown once."}
        </p>
        <pre className={cn("mt-6", codeBlockClass)}>
          {`Authorization: Bearer ${exampleKey}`}
        </pre>
        <ul className="mt-6 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {DEVELOPERS_PLANS.map((p) => (
            <li
              key={p.plan}
              className="rounded-full border border-gray-200 bg-white px-3 py-1 dark:border-white/15 dark:bg-white/5"
            >
              <span className={cn("font-mono", inlineCodeClass)}>{p.plan}</span>{" "}
              {isKo ? p.limitKo : p.limitEn}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          {isKo
            ? "월 한도 초과 시 HTTP 429 · 잘못된 키는 401"
            : "HTTP 429 when monthly limit exceeded · 401 for invalid keys"}
        </p>
      </NeonSection>

      <NeonSection className="!py-14" id="endpoints">
        <h2 className="text-xl font-bold text-foreground">
          {isKo ? "엔드포인트" : "Endpoints"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Base URL:{" "}
          <code className={inlineCodeClass}>{base}</code>
        </p>

        <div className="mt-10 space-y-12">
          {DEVELOPERS_ENDPOINTS.map((ep) => (
            <article key={ep.id} className={cn(neonCardClass, "p-6")}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                  {ep.method}
                </span>
                <code className={cn("text-sm", inlineCodeClass)}>{ep.path}</code>
              </div>
              <h3 className="mt-3 text-lg font-semibold text-foreground">
                {isKo ? ep.titleKo : ep.titleEn}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {isKo ? ep.descKo : ep.descEn}
              </p>

              {ep.params.length > 0 ? (
                <div className="mt-4">
                  <p className="font-display text-xs uppercase tracking-wider text-muted-foreground">
                    {isKo ? "쿼리 파라미터" : "Query params"}
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-foreground/80">
                    {ep.params.map((p) => (
                      <li key={p.name}>
                        <code className={inlineCodeClass}>{p.name}</code>{" "}
                        <span className="text-muted-foreground">({p.type})</span> —{" "}
                        {p.descKo}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <p className="mt-6 font-display text-xs uppercase tracking-wider text-muted-foreground">
                {isKo ? "응답 예시" : "Response example"}
              </p>
              <pre className={cn("mt-2", codeBlockClass)}>{ep.exampleResponse}</pre>

              <p className="mt-6 font-display text-xs uppercase tracking-wider text-muted-foreground">
                cURL
              </p>
              <pre className={cn("mt-2", codeBlockClass)}>
                {ep.exampleCurl(base, exampleKey)}
              </pre>
            </article>
          ))}
        </div>

        <div
          className={cn(
            neonCardClass,
            "mt-16 border-violet-200 bg-gradient-to-br from-violet-50/90 to-cyan-50/70 p-8 text-center dark:border-violet-500/30 dark:from-violet-950/30 dark:to-cyan-950/20",
          )}
        >
          <p className="text-lg font-semibold text-foreground">
            {isKo ? "지금 API 키를 발급하세요" : "Issue your API key now"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {isKo
              ? "로그인 후 마이페이지에서 키를 생성하고 바로 연동을 시작할 수 있습니다."
              : "Sign in, create a key in My page, and start integrating."}
          </p>
          <Link
            href="/my/api-keys"
            className="tkad-neon-cta-clean mt-6 inline-flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-bold"
          >
            <KeyRound className="h-4 w-4" aria-hidden />
            {isKo ? "API 키 발급" : "Get API key"}
          </Link>
        </div>
      </NeonSection>
    </HomeLandingDayNight>
  );
}
