import Link from "next/link";

const groups = [
  {
    label: "스튜디오",
    links: [
      { text: "소재 라이브러리", href: "/ko/creatives" },
      { text: "DOOH 플레이리스트", href: "/ko/creatives/playlists" },
      { text: "크리에이티브 스튜디오", href: "/ko/creatives/upload" },
    ],
  },
  {
    label: "정보·커뮤니티",
    links: [
      { text: "커뮤니티", href: "/ko/community" },
      { text: "아카데미", href: "/ko/academy" },
      { text: "FAQ", href: "/ko/faq" },
      { text: "용어집", href: "/ko/glossary" },
      { text: "회사소개", href: "/ko/about" },
      { text: "개발자 API", href: "/ko/developers" },
      { text: "포인트샵", href: "/ko/points" },
      { text: "매체 등록 신청", href: "/ko/register/media" },
      { text: "요금 안내", href: "/ko/pricing" },
    ],
  },
];

export function HomeMoreLinks() {
  return (
    <div className="border-t border-gray-100 px-4 py-4 dark:border-white/5">
      <h3 className="mb-3 text-sm font-semibold tracking-wider text-gray-400 uppercase dark:text-white/50">
        더 보기
      </h3>
      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 text-xs font-medium text-gray-400 dark:text-white/30">
              {group.label}
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-white/50 dark:hover:text-white"
                >
                  {link.text}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
