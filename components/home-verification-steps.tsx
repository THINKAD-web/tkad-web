"use client";

import { motion } from "framer-motion";
import { Camera, ClipboardCheck, Database, Search } from "lucide-react";
import { useTranslations } from "next-intl";

export function HomeVerificationSteps() {
  const t = useTranslations("homePage");
  const items = [
    { step: "01", icon: Search, title: t("verifyStep1Title"), desc: t("verifyStep1Desc") },
    { step: "02", icon: Camera, title: t("verifyStep2Title"), desc: t("verifyStep2Desc") },
    { step: "03", icon: Database, title: t("verifyStep3Title"), desc: t("verifyStep3Desc") },
    { step: "04", icon: ClipboardCheck, title: t("verifyStep4Title"), desc: t("verifyStep4Desc") },
  ];

  return (
    <div className="tkad-home-verification-steps relative mt-6 sm:mt-10 lg:mt-12">
      {/* Track line (desktop) */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-6 right-6 top-10 hidden h-px bg-white/10 lg:block"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-6 right-6 top-10 hidden h-px bg-[linear-gradient(to_right,transparent,rgba(124,58,237,0.25),transparent)] lg:block"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px -80px 0px" }}
              transition={{
                duration: 0.55,
                delay: idx * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={{ y: -3 }}
              className="group relative h-full rounded-[26px] bg-white/5 p-7 backdrop-blur transition-all hover:-translate-y-1 tkad-neon-border shadow-[0_28px_120px_rgba(0,0,0,0.78)] hover:shadow-[0_34px_140px_rgba(0,0,0,0.82)]"
            >
              {/* Big step number */}
              <div
                aria-hidden
                className="pointer-events-none absolute right-4 top-3 font-mono text-[44px] font-black leading-none tracking-tight text-white/10"
              >
                {item.step}
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <motion.div
                    whileHover={{ rotate: -2 }}
                    transition={{ type: "spring", stiffness: 260, damping: 16 }}
                    className="relative flex size-12 items-center justify-center rounded-2xl border border-white/12 bg-white/6 text-white group-hover:border-white/20"
                  >
                    <Icon className="size-6" strokeWidth={1.85} aria-hidden />
                    <div
                      aria-hidden
                      className="tkad-home-verification-icon-halo pointer-events-none absolute -inset-3 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
                      style={{
                        background:
                          "radial-gradient(circle, rgba(168,85,247,0.22) 0%, rgba(34,211,238,0.10) 40%, transparent 64%)",
                      }}
                    />
                  </motion.div>

                  <div className="min-w-0">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
                      STEP {item.step}
                    </p>
                    <h3 className="mt-1 text-lg font-black tracking-tight text-white">
                      {item.title}
                    </h3>
                  </div>
                </div>

                {/* Node dot (desktop) */}
                <div className="hidden lg:flex">
                  <div className="mt-2 size-5 rounded-full border border-white/12 bg-white/6 shadow-[0_0_0_6px_rgba(5,5,10,1)] transition-colors group-hover:border-white/20 group-hover:bg-white/10" />
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-white/74">
                {item.desc}
              </p>

              {/* Progress bar */}
              <div className="mt-5 h-1 w-full overflow-hidden bg-white/10">
                <motion.div
                  className="h-full bg-[linear-gradient(90deg,#a855f7_0%,#22d3ee_55%,#ec4899_100%)]"
                  initial={{ width: "0%" }}
                  whileInView={{ width: "100%" }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.9,
                    delay: 0.12 + idx * 0.08,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
