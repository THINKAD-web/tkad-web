import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { pageAlternates } from "@/lib/seo";
import { buildBreadcrumbJsonLd } from "@/lib/structured-data";
import { Shield, AlertTriangle, FileText, Users } from "lucide-react";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo ? "커뮤니티 운영 정책" : "Community Policy";
  const description = isKo
    ? "THINKAD 커뮤니티 게시판 운영 정책 — 게시 가이드라인, 신고 / 모더레이션 절차, 작성자 정보 처리 안내."
    : "THINKAD Community board policy — posting guidelines, report / moderation procedures, author data handling.";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/community/policy"),
    openGraph: { title, description, type: "website" },
    robots: { index: true, follow: true },
  };
}

/**
 * 커뮤니티 운영 정책.
 *
 * 운영 보호:
 *   - 본 페이지는 표준 템플릿 기반 초안. 법무 / 운영자 검수 후 본문 수정 권장.
 *   - 광고주 발송 산출물 영향 없음.
 */
export default async function CommunityPolicyPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";

  const breadcrumb = buildBreadcrumbJsonLd(locale, [
    { name: isKo ? "홈" : "Home", path: "" },
    { name: isKo ? "커뮤니티" : "Community", path: "/community" },
    { name: isKo ? "운영 정책" : "Policy", path: "/community/policy" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <section className="bg-hero-void py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
            [ {isKo ? "정책" : "POLICY"} ]
          </p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-hero-fg sm:text-4xl">
            <Shield className="mr-3 inline-block h-8 w-8 text-accent" aria-hidden />
            {isKo ? "커뮤니티 운영 정책" : "Community Policy"}
          </h1>
          <p className="mt-6 text-base leading-relaxed text-hero-fg/80">
            {isKo
              ? "THINKAD 커뮤니티는 광고주·매체사·마케터 간의 정보 교류 공간입니다. 건강한 토론을 위해 다음 정책을 따라주세요."
              : "THINKAD Community is a space for advertisers, media operators, and marketers to share information. Please follow these policies for healthy discussion."}
          </p>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-hero-fg/55">
            {`// `}
            {isKo ? "최종 갱신" : "Last updated"}: 2026.04.28
          </p>
        </div>
      </section>

      <article className="bg-card py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-12">
          {/* 1. 게시 가이드라인 */}
          <section>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
              [ 1. {isKo ? "게시 가이드라인" : "POSTING GUIDELINES"} ]
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              <FileText className="mr-2 inline h-6 w-6 text-accent" aria-hidden />
              {isKo ? "이런 글은 환영합니다" : "Welcome content"}
            </h2>
            <ul className="mt-5 space-y-2">
              {(isKo
                ? [
                    "OOH 광고 진행 / 매체 선정 / 비용에 대한 진솔한 질문",
                    "직접 집행한 매체에 대한 객관적 후기 (긍정 + 부정 모두)",
                    "캠페인 목표·예산에 맞는 매체 추천 요청",
                    "업계 트렌드 / 사례 / 노하우 공유",
                  ]
                : [
                    "Honest questions on OOH campaigns, media selection, costs",
                    "Objective reviews of media you've used (both positive and negative)",
                    "Requests for media recommendations matching your campaign",
                    "Industry trends, case studies, know-how",
                  ]).map((line, i) => (
                <li
                  key={i}
                  className="flex gap-3 border-l-2 border-accent pl-4 text-base leading-relaxed text-foreground"
                >
                  {line}
                </li>
              ))}
            </ul>
          </section>

          {/* 2. 금지 사항 */}
          <section>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
              [ 2. {isKo ? "금지 사항" : "PROHIBITED"} ]
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              <AlertTriangle className="mr-2 inline h-6 w-6 text-accent" aria-hidden />
              {isKo ? "다음 게시물은 사전 통보 없이 숨김 / 삭제됩니다" : "Removed without notice"}
            </h2>
            <ul className="mt-5 space-y-2">
              {(isKo
                ? [
                    "광고 / 영업 / 도배성 게시물",
                    "특정인 / 특정 회사에 대한 비방 · 명예훼손",
                    "타인의 개인정보 (이름·전화번호·이메일·계좌번호 등) 게시",
                    "음란 / 폭력 / 차별 / 혐오 표현",
                    "저작권 침해 콘텐츠 (무단 복제 이미지 / 영상 등)",
                    "허위 정보 / 검증되지 않은 매체 단가 / 거짓 후기",
                    "타인의 ID / 익명 계정으로 가장한 글",
                  ]
                : [
                    "Advertising / sales / spam posts",
                    "Defamation or attacks on specific individuals or companies",
                    "Posting others' personal info (names, phone, email, accounts)",
                    "Obscene / violent / discriminatory / hateful content",
                    "Copyright-infringing content (unauthorized images, videos)",
                    "False information, fabricated rates, fake reviews",
                    "Posts impersonating others or fake anonymous accounts",
                  ]).map((line, i) => (
                <li
                  key={i}
                  className="flex gap-3 border-l-2 border-border pl-4 text-base leading-relaxed text-foreground"
                >
                  {line}
                </li>
              ))}
            </ul>
          </section>

          {/* 3. 신고 / 모더레이션 */}
          <section>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
              [ 3. {isKo ? "신고 · 모더레이션" : "REPORTS & MODERATION"} ]
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {isKo ? "신고 절차" : "Report procedure"}
            </h2>
            <ol className="mt-5 space-y-3 list-decimal pl-5 text-base leading-relaxed text-foreground">
              <li>
                {isKo
                  ? "부적절한 게시물 / 댓글 우측의 [ 신고 ] 버튼 클릭"
                  : "Click the [ REPORT ] button next to the post / comment"}
              </li>
              <li>
                {isKo
                  ? "신고 사유 입력 (5자 이상 500자 이내)"
                  : "Enter reason (5-500 characters)"}
              </li>
              <li>
                {isKo
                  ? "동일 게시물에 신고 3회 누적 시 자동 숨김 처리됩니다"
                  : "After 3 reports, the post is auto-hidden"}
              </li>
              <li>
                {isKo
                  ? "어드민이 24시간 내 검토 후 복구 / 영구 삭제 결정"
                  : "Admin reviews within 24 hours and decides to restore or delete permanently"}
              </li>
              <li>
                {isKo
                  ? "허위 신고 반복 시 IP 차단될 수 있습니다"
                  : "Repeated false reports may result in IP ban"}
              </li>
            </ol>
          </section>

          {/* 4. 작성자 정보 처리 */}
          <section>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
              [ 4. {isKo ? "작성자 정보 처리" : "AUTHOR DATA HANDLING"} ]
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              <Users className="mr-2 inline h-6 w-6 text-accent" aria-hidden />
              {isKo ? "수집·저장 항목" : "What we collect"}
            </h2>
            <div className="mt-5 space-y-4 text-base leading-relaxed text-foreground">
              <p>
                {isKo
                  ? "커뮤니티 글 / 댓글 작성 시 다음 정보가 저장됩니다:"
                  : "When you post or comment, we store:"}
              </p>
              <ul className="space-y-2 pl-5 list-disc">
                <li>
                  {isKo
                    ? "표시명 (익명 시 “익명” 또는 사용자 입력값)"
                    : "Display name (\"Anonymous\" or user-entered)"}
                </li>
                <li>
                  {isKo
                    ? "이메일 (선택, 답변 통보용 — 게시물에 노출되지 않음)"
                    : "Email (optional, for reply notification — not shown publicly)"}
                </li>
                <li>
                  {isKo
                    ? "IP 주소 (스팸 방지 / 신고 추적 용도, 60일 후 익명화)"
                    : "IP address (anti-spam / report tracking, anonymized after 60 days)"}
                </li>
                <li>
                  {isKo
                    ? "가입 사용자: User.id (글 / 댓글 관리용)"
                    : "Registered users: User.id (for post/comment management)"}
                </li>
              </ul>
              <p>
                {isKo
                  ? "작성한 게시물은 본인 요청 시 삭제 가능합니다 (가입 사용자: 마이페이지, 익명: mannote@tkad.co.kr 로 게시물 ID + 작성 IP 함께 요청)."
                  : "You may request deletion (registered: My Page; anonymous: email mannote@tkad.co.kr with post ID + IP)."}
              </p>
              <p>
                {isKo
                  ? "전체 개인정보 처리방침은 "
                  : "See full privacy policy at "}
                <Link
                  href="/privacy"
                  className="font-bold underline underline-offset-4 hover:text-accent"
                >
                  {isKo ? "개인정보 처리방침" : "Privacy Policy"}
                </Link>
                {isKo ? " 페이지를 참고해주세요." : "."}
              </p>
            </div>
          </section>

          {/* 5. 면책 */}
          <section>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
              [ 5. {isKo ? "면책 조항" : "DISCLAIMER"} ]
            </p>
            <div className="mt-3 border-2 border-border bg-muted p-5 text-sm leading-relaxed text-foreground">
              <p>
                {isKo
                  ? "커뮤니티 게시물의 내용 — 매체 단가, 후기, 추천 등 — 은 작성자 개인의 의견이며, THINKAD 의 공식 입장이 아닙니다. THINKAD 는 게시물의 정확성을 보장하지 않으며, 이용자가 게시물 정보를 토대로 의사결정한 결과에 대해 책임지지 않습니다."
                  : "Community posts — including rate quotes, reviews, recommendations — represent the authors' personal opinions, not THINKAD's official position. THINKAD does not guarantee accuracy and is not liable for decisions made based on community content."}
              </p>
              <p className="mt-3">
                {isKo
                  ? "정확한 매체 단가 / 가용성 / 효과 데이터는 THINKAD 공식 견적 (/quote) 또는 무료 상담 (/contact) 을 이용해 주세요."
                  : "For accurate rates, availability, and performance data, please use the official quote (/quote) or free consultation (/contact)."}
              </p>
            </div>
          </section>

          {/* 6. 문의 */}
          <section>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
              [ 6. {isKo ? "문의" : "CONTACT"} ]
            </p>
            <p className="mt-3 text-base leading-relaxed text-foreground">
              {isKo
                ? "본 정책 / 게시물 / 신고 관련 문의: "
                : "Questions about this policy / posts / reports: "}
              <a
                href="mailto:mannote@tkad.co.kr"
                className="font-bold underline underline-offset-4 hover:text-accent"
              >
                mannote@tkad.co.kr
              </a>
            </p>
          </section>
        </div>
      </article>
    </>
  );
}
