import { getTranslations } from "next-intl/server";
import { CONTACT_EMAIL } from "@/lib/constants";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";

type Props = {
  locale: string;
};

export async function ContactHeroServer({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "contact" });
  const isKo = locale === "ko";

  const infoItems = [
    { label: "PHONE", value: t("phoneNumber") },
    { label: "EMAIL", value: CONTACT_EMAIL },
    { label: "ADDRESS", value: t("address") },
  ];

  return (
    <NeonSection>
      <NeonSectionHead
        number="01"
        kicker={isKo ? "Contact" : "Contact"}
        title={
          isKo ? (
            <>
              30초 상담 신청,{" "}
              <span className="tkad-home-accent-text">24시간 내</span> 연락
            </>
          ) : (
            <>
              Apply in 30s, hear back{" "}
              <span className="tkad-home-accent-text">within 24h</span>
            </>
          )
        }
        meta={
          isKo
            ? "free consultation · verified inventory"
            : "free consultation · verified inventory"
        }
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {infoItems.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur"
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
              {item.label}
            </p>
            <p className="mt-2 text-sm font-semibold text-white/85">{item.value}</p>
          </div>
        ))}
      </div>
    </NeonSection>
  );
}
