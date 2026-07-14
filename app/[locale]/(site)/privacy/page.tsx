import { resolveLocaleParam } from "@/lib/resolve-locale";
import { setRequestLocale } from "next-intl/server";
import dynamic from "next/dynamic";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/constants";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { CategoryExploreHero } from "@/components/category-explore-hero";

const ScrollAnimate = dynamic(() => import("@/components/scroll-animate"));

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function PrivacyPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);

  return <PrivacyContent locale={locale} />;
}

function PrivacyContent({
  locale,
}: {
  locale: string;
}) {
  const isKo = locale === "ko";

  return (
    <HomeLandingDayNight>
      <CategoryExploreHero
        code="// 22 · PRIVACY"
        headlineBefore={isKo ? "개인정보 " : "Privacy "}
        headlineGradient={isKo ? "처리방침" : "Policy"}
        subtitle={
          isKo
            ? "주식회사 싱커드(THINKAD)는 고객의 개인정보 보호를 최우선으로 합니다"
            : "THINKAD Co., Ltd. is committed to protecting your personal information"
        }
      />

      <section className="bg-card py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimate>
            <div className="prose prose-sm sm:prose lg:prose-lg max-w-none">
              {/* Section 1: Introduction */}
              <div className="mb-12">
                <h2 className="mb-4 border-b-2 border-border pb-2 text-2xl font-bold tracking-tight text-foreground">
                  {isKo ? "1. 개요" : "1. Overview"}
                </h2>
                <p className="text-foreground leading-relaxed">
                  {isKo
                    ? "주식회사 싱커드(THINKAD, 이하 '회사')는 「개인정보 보호법」 및 관련 법령을 준수하며, 고객의 개인정보를 안전하게 관리하고 있습니다. 본 개인정보 처리방침은 회사가 제공하는 OOH 광고 기획·매체 중개 서비스(이하 '서비스')를 이용할 때 고객의 개인정보가 어떻게 수집·이용·보관·파기되는지 안내합니다."
                    : "THINKAD Co., Ltd. (hereinafter 'Company') complies with the Personal Information Protection Act and related laws to safely manage customer personal information. This Privacy Policy explains how your personal information is collected, used, stored, and disposed of when you use the OOH advertising planning and media brokerage services provided by the Company."}
                </p>
              </div>

              {/* Section 2: Information Collection */}
              <div className="mb-12">
                <h2 className="mb-4 border-b-2 border-border pb-2 text-2xl font-bold tracking-tight text-foreground">
                  {isKo ? "2. 수집하는 개인정보" : "2. Information We Collect"}
                </h2>
                <p className="text-foreground mb-4">
                  {isKo ? "회사는 다음과 같은 정보를 수집합니다:" : "The Company collects the following information:"}
                </p>
                <ul className="list-disc list-inside text-foreground space-y-2">
                  {isKo ? (
                    <>
                      <li>문의 및 상담 시 수집: 이름, 연락처, 이메일, 회사명, 문의 내용</li>
                      <li>매체 조회 시 수집: 조회 기록, IP 주소, 기기 정보</li>
                      <li>고객 피드백: 만족도 조사, 설문 응답 정보</li>
                      <li>자동 수집: 쿠키, 접속 로그, 방문 기록</li>
                    </>
                  ) : (
                    <>
                      <li>Inquiry & Consultation: Name, contact number, email, company name, inquiry content</li>
                      <li>Media Search: Search history, IP address, device information</li>
                      <li>Customer Feedback: Survey responses, feedback content</li>
                      <li>Automatic Collection: Cookies, access logs, visit history</li>
                    </>
                  )}
                </ul>
              </div>

              {/* Section 3: Purpose of Collection */}
              <div className="mb-12">
                <h2 className="mb-4 border-b-2 border-border pb-2 text-2xl font-bold tracking-tight text-foreground">
                  {isKo ? "3. 개인정보 수집 목적" : "3. Purpose of Collection"}
                </h2>
                <ul className="list-disc list-inside text-foreground space-y-2">
                  {isKo ? (
                    <>
                      <li>서비스 제공 및 고객 지원</li>
                      <li>문의 및 요청사항 처리</li>
                      <li>마케팅 및 광고 정보 제공</li>
                      <li>서비스 개선 및 통계 분석</li>
                      <li>법률 준수 및 분쟁 해결</li>
                    </>
                  ) : (
                    <>
                      <li>Service provision and customer support</li>
                      <li>Processing inquiries and requests</li>
                      <li>Marketing and advertising information</li>
                      <li>Service improvement and statistical analysis</li>
                      <li>Legal compliance and dispute resolution</li>
                    </>
                  )}
                </ul>
              </div>

              {/* Section 4: Data Protection */}
              <div className="mb-12">
                <h2 className="mb-4 border-b-2 border-border pb-2 text-2xl font-bold tracking-tight text-foreground">
                  {isKo ? "4. 개인정보 보호 조치" : "4. Information Protection Measures"}
                </h2>
                <p className="text-foreground mb-4">
                  {isKo
                    ? "회사는 다음과 같은 조치를 통해 개인정보를 보호합니다:"
                    : "The Company protects your information through the following measures:"}
                </p>
                <ul className="list-disc list-inside text-foreground space-y-2">
                  {isKo ? (
                    <>
                      <li>SSL 암호화를 통한 데이터 전송 보안</li>
                      <li>접근 제어 및 권한 관리</li>
                      <li>정기적인 보안 감사 및 취약점 분석</li>
                      <li>직원 교육 및 보안 정책 준수</li>
                      <li>데이터베이스 암호화</li>
                    </>
                  ) : (
                    <>
                      <li>SSL encryption for secure data transmission</li>
                      <li>Access control and authority management</li>
                      <li>Regular security audits and vulnerability analysis</li>
                      <li>Employee training and security policy compliance</li>
                      <li>Database encryption</li>
                    </>
                  )}
                </ul>
              </div>

              {/* Section 5: Data Retention */}
              <div className="mb-12">
                <h2 className="mb-4 border-b-2 border-border pb-2 text-2xl font-bold tracking-tight text-foreground">
                  {isKo ? "5. 개인정보 보유 및 이용 기간" : "5. Data Retention Period"}
                </h2>
                <p className="text-foreground leading-relaxed">
                  {isKo
                    ? "개인정보는 수집 목적 달성 시까지 보유하며, 법적 요구사항이 있는 경우 관련 법령에서 정한 기간 동안 보유합니다. 회사의 서비스 약관에 따라 문의 기록은 3년간 보유되며, 더 이상 필요하지 않은 경우 안전하게 삭제합니다."
                    : "Personal information is retained until the purpose of collection is achieved. If there are legal requirements, information is retained for the period specified by relevant laws. In accordance with the Company's terms of service, inquiry records are retained for 3 years and securely deleted when no longer necessary."}
                </p>
              </div>

              {/* Section 6: User Rights */}
              <div className="mb-12">
                <h2 className="mb-4 border-b-2 border-border pb-2 text-2xl font-bold tracking-tight text-foreground">
                  {isKo ? "6. 사용자의 권리" : "6. Your Rights"}
                </h2>
                <p className="text-foreground mb-4">
                  {isKo ? "고객은 다음의 권리를 가집니다:" : "You have the following rights:"}
                </p>
                <ul className="list-disc list-inside text-foreground space-y-2">
                  {isKo ? (
                    <>
                      <li>개인정보 열람 요청권</li>
                      <li>개인정보 정정 요청권</li>
                      <li>개인정보 삭제 요청권</li>
                      <li>개인정보 이용 정지 요청권</li>
                      <li>개인정보 동의 철회권</li>
                    </>
                  ) : (
                    <>
                      <li>Right to access your personal information</li>
                      <li>Right to correct inaccurate information</li>
                      <li>Right to delete your information</li>
                      <li>Right to suspend use of your information</li>
                      <li>Right to withdraw consent</li>
                    </>
                  )}
                </ul>
                <p className="text-foreground mt-4">
                  {isKo
                    ? "위의 권리를 행사하시려면 회사에 서면으로 요청하시기 바랍니다."
                    : "To exercise these rights, please contact the Company in writing."}
                </p>
              </div>

              {/* Section 7: Third Party Information Sharing */}
              <div className="mb-12">
                <h2 className="mb-4 border-b-2 border-border pb-2 text-2xl font-bold tracking-tight text-foreground">
                  {isKo ? "7. 제3자 정보 공유" : "7. Third Party Information Sharing"}
                </h2>
                <p className="text-foreground leading-relaxed">
                  {isKo
                    ? "회사는 고객의 동의 없이 개인정보를 제3자와 공유하지 않습니다. 단, 법적 의무 또는 법원의 명령이 있는 경우는 예외입니다."
                    : "The Company does not share personal information with third parties without your consent, except when required by law or court order."}
                </p>
              </div>

              {/* Section 8: Cookies */}
              <div className="mb-12">
                <h2 className="mb-4 border-b-2 border-border pb-2 text-2xl font-bold tracking-tight text-foreground">
                  {isKo ? "8. 쿠키 사용" : "8. Cookie Policy"}
                </h2>
                <p className="text-foreground leading-relaxed mb-4">
                  {isKo
                    ? "회사는 사용자 경험 향상을 위해 쿠키를 사용합니다. 쿠키는 사용자의 브라우저에 저장되는 작은 파일로, 사용자는 브라우저 설정을 통해 쿠키를 거부하거나 삭제할 수 있습니다."
                    : "The Company uses cookies to enhance user experience. Cookies are small files stored in your browser. You can refuse or delete cookies through your browser settings."}
                </p>
              </div>

              {/* Section 9: Policy Changes */}
              <div className="mb-12">
                <h2 className="mb-4 border-b-2 border-border pb-2 text-2xl font-bold tracking-tight text-foreground">
                  {isKo ? "9. 정책 변경" : "9. Policy Changes"}
                </h2>
                <p className="text-foreground leading-relaxed">
                  {isKo
                    ? "회사는 법률 변경 또는 서비스 개선을 위해 개인정보 보호정책을 수정할 수 있습니다. 정책의 주요 변경사항은 웹사이트를 통해 공지합니다."
                    : "The Company may modify this Privacy Policy to comply with legal changes or improve services. Major changes will be notified through the website."}
                </p>
              </div>

              {/* Section 10: Contact */}
              <div className="mb-12">
                <h2 className="mb-4 border-b-2 border-border pb-2 text-2xl font-bold tracking-tight text-foreground">
                  {isKo ? "10. 연락처" : "10. Contact Information"}
                </h2>
                <p className="text-foreground leading-relaxed mb-4">
                  {isKo ? "개인정보 관련 문의 및 요청사항이 있으시면 다음 주소로 연락주시기 바랍니다:" : "For inquiries or requests regarding personal information, please contact:"}
                </p>
                <div className="space-y-1 border-2 border-border bg-muted p-4">
                  {isKo ? (
                    <p className="text-foreground">
                      <strong>주식회사 싱커드 (THINKAD)</strong><br />
                      사업자등록번호: 319-86-00382<br />
                      주소: 서울특별시 성동구 뚝섬로17가길 48 성수에이원지식산업센터 1102호<br />
                      전화: 02-515-2772<br />
                      이메일:{" "}
                      <a href={CONTACT_MAILTO} className="border-b-2 border-border pb-0.5 text-foreground transition-colors hover:border-accent hover:text-accent">{CONTACT_EMAIL}</a>
                    </p>
                  ) : (
                    <p className="text-foreground">
                      <strong>THINKAD Co., Ltd.</strong><br />
                      Business Registration: 319-86-00382<br />
                      Address: #1102, Seongsu A-One Knowledge Industry Center, 48 Ttukseom-ro 17ga-gil, Seongdong-gu, Seoul<br />
                      Phone: +82-2-515-2772<br />
                      Email:{" "}
                      <a href={CONTACT_MAILTO} className="border-b-2 border-border pb-0.5 text-foreground transition-colors hover:border-accent hover:text-accent">{CONTACT_EMAIL}</a>
                    </p>
                  )}
                </div>
              </div>

              {/* Last Updated */}
              <div className="mt-16 border-t-2 border-border pt-8">
                <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {isKo ? "최종 업데이트: 2026년 4월" : "Last Updated: April 2026"}
                </p>
              </div>
            </div>
          </ScrollAnimate>
        </div>
      </section>
    </HomeLandingDayNight>
  );
}
