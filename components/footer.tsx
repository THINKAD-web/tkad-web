import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { KAKAO_CHANNEL_PUBLIC_URL } from "@/lib/kakao-public";
import { Mail, MapPin, Phone, Megaphone, Globe, BarChart3, Wrench, MessageCircle } from "lucide-react";

const INSTAGRAM_URL = "https://www.instagram.com/thinkad_korea" as const;

/**
 * Instagram brand icon.
 * lucide-react v1.8.0 은 상표 정책상 브랜드 로고를 export 하지 않아 인라인 SVG 로 대체.
 */
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

export default function Footer() {
  const t = useTranslations();

  const navItems = [
    { href: "/register/media", label: t("footer.mediaPartnerRegister") },
    { href: "/services", label: t("nav.services") },
    { href: "/media", label: t("footer.linkFeaturedMedia") },
    { href: "/cases", label: t("nav.cases") },
    { href: "/contact", label: t("nav.contact") },
    { href: "/privacy", label: t("footer.privacy") },
    { href: "/terms", label: t("footer.terms") },
    { href: "/refund", label: t("footer.refund") },
    { href: "/guarantee", label: t("footer.guarantee") },
  ];

  const serviceItems = [
    { href: "/media", label: t("footer.domesticOOH"), icon: Megaphone },
    { href: "/planner", label: t("footer.crossBorderOOH"), icon: Globe },
    { href: "/contact", label: t("footer.dataConsulting"), icon: BarChart3 },
    { href: "/planner", label: t("footer.planningTool"), icon: Wrench },
  ];

  return (
    <footer id="site-footer" className="relative overflow-hidden border-t border-silver/15 bg-gradient-to-b from-primary via-navy-dark to-[#040914] dark:text-white text-gray-900">
      <div className="hero-pattern absolute inset-0 opacity-[0.14]" />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="text-xl font-extrabold tracking-tight">
              THINK<span className="bg-gradient-to-r from-gold via-gold-light to-silver bg-clip-text text-transparent">AD</span>
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-silver/90">
              {t("footer.description")}
            </p>
            <div className="mt-5 space-y-1.5 text-sm text-silver/90">
              <p>{t("footer.companyName")}</p>
              <p>{t("footer.bizNumber")}</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold tracking-wide text-gold">
              {t("footer.quickLinks")}
            </h4>
            <ul className="mt-4 space-y-2.5">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="link-underline-grow inline-block text-sm text-silver/90 transition-colors duration-300 hover:text-gold-light"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold tracking-wide text-gold">
              {t("footer.contactInfo")}
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm text-silver/90">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold/50" />
                {t("footer.address")}
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-gold/50" />
                {t("footer.phone")}
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-gold/50" />
                {t("footer.email")}
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 shrink-0 text-gold/50" />
                <a
                  href={KAKAO_CHANNEL_PUBLIC_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-underline-grow hover:text-gold-light transition-colors duration-300"
                >
                  {t("footer.kakaoChannel")}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <InstagramIcon className="h-4 w-4 shrink-0 text-gold/50" />
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-underline-grow hover:text-gold-light transition-colors duration-300"
                >
                  Instagram · @thinkad_korea
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold tracking-wide text-gold">
              {t("footer.services")}
            </h4>
            <ul className="mt-4 space-y-2.5">
              {serviceItems.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="link-underline-grow flex items-center gap-2 text-sm text-silver/90 transition-colors duration-300 hover:text-gold-light"
                  >
                    <item.icon className="h-4 w-4 shrink-0 text-gold/50" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t dark:border-white/10 border-gray-200 pt-8">
          <div className="mb-4 text-center text-xs leading-relaxed text-silver/70">
            <p>{t("footer.ecommerce")} | {t("footer.address")}</p>
          </div>
          <div className="text-center text-sm text-silver/70">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </div>
        </div>
      </div>
    </footer>
  );
}
