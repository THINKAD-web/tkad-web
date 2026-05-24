import { Camera, ClipboardCheck, Database, Search } from "lucide-react";
import { getTranslations } from "next-intl/server";

/** 홈 [01] 검증 스텝 — 서버 렌더(크롤러·첫 HTML) */
export async function HomeVerificationStepsServer() {
  const t = await getTranslations("homePage");
  const items = [
    { step: "01", icon: Search, title: t("verifyStep1Title"), desc: t("verifyStep1Desc") },
    { step: "02", icon: Camera, title: t("verifyStep2Title"), desc: t("verifyStep2Desc") },
    { step: "03", icon: Database, title: t("verifyStep3Title"), desc: t("verifyStep3Desc") },
    { step: "04", icon: ClipboardCheck, title: t("verifyStep4Title"), desc: t("verifyStep4Desc") },
  ];

  return (
    <div className="tkad-home-verification-steps relative mt-6 sm:mt-10 lg:mt-12">
      <div
        aria-hidden
        className="pointer-events-none absolute left-6 right-6 top-10 hidden h-px dark:bg-white/10 bg-gray-100 lg:block"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-6 right-6 top-10 hidden h-px bg-[linear-gradient(to_right,transparent,rgba(124,58,237,0.25),transparent)] lg:block"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.step}
              className="group relative h-full rounded-[28px] dark:bg-white/6 bg-gray-50 p-5 backdrop-blur transition-all hover:-translate-y-1 tkad-neon-border tkad-neon-glow sm:p-7 lg:p-8"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-500">
                  [{item.step}]
                </span>
                <Icon
                  className="h-7 w-7 dark:text-white text-gray-700 transition-colors group-hover:dark:text-white text-gray-900"
                  strokeWidth={1.75}
                  aria-hidden
                />
              </div>
              <h3 className="text-xl font-black tracking-tight dark:text-white text-gray-900">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed dark:text-white">{item.desc}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
