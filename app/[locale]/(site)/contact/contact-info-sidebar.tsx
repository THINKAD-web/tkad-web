import { getTranslations } from "next-intl/server";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/constants";

type Props = {
  locale: string;
};

export async function ContactInfoSidebar({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "contact" });

  const items = [
    { icon: Phone, label: t("phone"), value: t("phoneNumber") },
    { icon: Mail, label: t("email"), value: CONTACT_EMAIL },
    { icon: MapPin, label: t("addressLabel"), value: t("address") },
    { icon: Clock, label: t("hoursLabel"), value: t("hours") },
  ] as const;

  return (
    <aside className="rounded-2xl border border-gray-200 bg-gray-50 p-6 backdrop-blur dark:border-white/10 dark:bg-white/5 sm:p-8">
      <h2 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
        {t("infoTitle")}
      </h2>
      <ul className="mt-6 space-y-4">
        {items.map(({ icon: Icon, label, value }) => (
          <li key={label} className="flex gap-3">
            <Icon
              className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--qp-accent)]"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="tkad-type-title uppercase tracking-wide text-gray-500 dark:text-white/50">
                {label}
              </p>
              <p className="mt-0.5 text-sm font-medium leading-relaxed text-gray-800 dark:text-white/90">
                {value}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
