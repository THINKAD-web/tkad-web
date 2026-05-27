import Link from "next/link";

const INFO_LINKS = [
  { text: "커뮤니티", href: "/ko/community" },
  { text: "FAQ", href: "/ko/faq" },
  { text: "용어집", href: "/ko/glossary" },
] as const;

export function HomeMoreLinks() {
  return (
    <section
      className="border-t border-gray-100 px-4 py-5 dark:border-white/5"
      aria-label="정보·커뮤니티"
    >
      <p className="mb-3 text-xs font-semibold tracking-wide text-gray-600 dark:text-white/60">
        정보·커뮤니티
      </p>
      <div className="grid grid-cols-3 gap-2 sm:max-w-md sm:gap-3">
        {INFO_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex min-h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-2 text-center text-sm font-semibold text-gray-800 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 active:scale-[0.98] dark:border-white/12 dark:bg-white/[0.06] dark:text-white dark:hover:border-violet-400/35 dark:hover:bg-violet-500/10"
          >
            {link.text}
          </Link>
        ))}
      </div>
    </section>
  );
}
