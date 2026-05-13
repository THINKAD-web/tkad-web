import { LockKeyhole, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Props = {
  locale: string;
  title: string;
  body: string;
  nextPath: string;
  className?: string;
};

export function CommunityMemberRequiredPanel({
  locale,
  title,
  body,
  nextPath,
  className,
}: Props) {
  const loginHref = `/login?next=${encodeURIComponent(`/${locale}${nextPath}`)}`;
  const isKo = locale === "ko";

  return (
    <div
      className={cn(
        "rounded-[28px] border border-white/12 bg-white/6 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.7)] backdrop-blur tkad-neon-border",
        className,
      )}
    >
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">
        [ MEMBERS ONLY ]
      </p>
      <h2 className="mt-3 flex items-center gap-2 text-xl font-bold tracking-tight text-white">
        <LockKeyhole className="h-5 w-5 text-white/82" />
        {title}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-white/68">{body}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={loginHref}
          className="inline-flex items-center gap-2 rounded-full border border-[#8b5cf6]/55 bg-[linear-gradient(135deg,rgba(168,85,247,0.26),rgba(34,211,238,0.16))] px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white transition-colors hover:bg-white/10"
        >
          {isKo ? "로그인하고 계속하기" : "Sign in to continue"}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
