import { Link } from "@/i18n/navigation";

type LinkItem = { href: string; labelKo: string; labelEn: string };

const STUDIO_LINKS: LinkItem[] = [
  { href: "/creatives", labelKo: "소재 라이브러리", labelEn: "Creative library" },
  {
    href: "/creatives/playlists",
    labelKo: "DOOH 플레이리스트",
    labelEn: "DOOH playlists",
  },
  {
    href: "/creatives/upload",
    labelKo: "크리에이티브 스튜디오",
    labelEn: "Creative studio",
  },
];

const INFO_LINKS: LinkItem[] = [
  { href: "/community", labelKo: "커뮤니티", labelEn: "Community" },
  { href: "/academy", labelKo: "아카데미", labelEn: "Academy" },
  { href: "/faq", labelKo: "FAQ", labelEn: "FAQ" },
  { href: "/glossary", labelKo: "용어집", labelEn: "Glossary" },
  { href: "/about", labelKo: "회사소개", labelEn: "About" },
  { href: "/developers", labelKo: "개발자 API", labelEn: "Developers API" },
  { href: "/points", labelKo: "포인트샵", labelEn: "Points shop" },
  {
    href: "/register/media",
    labelKo: "매체 등록 신청",
    labelEn: "List your media",
  },
];

function LinkRow({
  items,
  isKo,
}: {
  items: LinkItem[];
  isKo: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-2">
      {items.map((item, index) => (
        <span key={item.href} className="inline-flex items-center">
          {index > 0 ? (
            <span className="mr-3 text-gray-300 dark:text-white/20" aria-hidden>
              ·
            </span>
          ) : null}
          <Link
            href={item.href}
            className="text-sm text-gray-400 transition hover:text-gray-900 dark:text-white/40 dark:hover:text-white"
          >
            {isKo ? item.labelKo : item.labelEn}
          </Link>
        </span>
      ))}
    </div>
  );
}

type Props = { locale: string };

export function HomeMoreLinks({ locale }: Props) {
  const isKo = locale.startsWith("ko");

  return (
    <section
      className="border-b border-gray-100 py-6 dark:border-white/5"
      data-screenshot="home-more-links"
    >
      <p className="text-sm font-semibold text-gray-900 dark:text-white">
        {isKo ? "더 많은 서비스" : "More services"}
      </p>
      <div className="mt-4 space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium text-gray-400 dark:text-white/45">
            {isKo ? "스튜디오" : "Studio"}
          </p>
          <LinkRow items={STUDIO_LINKS} isKo={isKo} />
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-gray-400 dark:text-white/45">
            {isKo ? "커뮤니티·정보" : "Community & info"}
          </p>
          <LinkRow items={INFO_LINKS} isKo={isKo} />
        </div>
      </div>
    </section>
  );
}
