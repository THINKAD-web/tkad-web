import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Mail, MapPin, Phone, Megaphone, Globe, BarChart3, Wrench } from "lucide-react";

export default function Footer() {
  const t = useTranslations();

  const navItems = [
    { href: "/", label: t("nav.home") },
    { href: "/media", label: t("nav.media") },
    { href: "/about", label: t("nav.about") },
    { href: "/tools", label: t("nav.tools") },
    { href: "/cases", label: t("nav.cases") },
    { href: "/resources", label: t("nav.resources") },
    { href: "/contact", label: t("nav.contact") },
  ];

  const serviceItems = [
    { href: "/media", label: t("footer.domesticOOH"), icon: Megaphone },
    { href: "/about", label: t("footer.crossBorderOOH"), icon: Globe },
    { href: "/contact", label: t("footer.dataConsulting"), icon: BarChart3 },
    { href: "/tools", label: t("footer.planningTool"), icon: Wrench },
  ];

  return (
    <footer className="border-t bg-navy text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="text-lg font-bold">THINKAD</h3>
            <p className="mt-1 text-sm text-slate-400">
              {t("footer.description")}
            </p>
            <div className="mt-4 space-y-1 text-sm text-slate-400">
              <p>{t("footer.companyName")}</p>
              <p>{t("footer.ceo")}</p>
              <p>{t("footer.bizNumber")}</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gold">
              {t("footer.quickLinks")}
            </h4>
            <ul className="mt-3 space-y-2">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-slate-400 transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gold">
              {t("footer.contactInfo")}
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                {t("footer.address")}
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" />
                {t("footer.phone")}
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                {t("footer.email")}
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gold">
              {t("footer.services")}
            </h4>
            <ul className="mt-3 space-y-2">
              {serviceItems.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-700 pt-8">
          <div className="mb-4 text-center text-xs leading-relaxed text-slate-500">
            <p>{t("footer.companyName")} | {t("footer.ceo")} | {t("footer.bizNumber")}</p>
            <p>{t("footer.ecommerce")} | {t("footer.address")}</p>
          </div>
          <div className="text-center text-sm text-slate-500">
            {t("footer.copyright")}
          </div>
        </div>
      </div>
    </footer>
  );
}
