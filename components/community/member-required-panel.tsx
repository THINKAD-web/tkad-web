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
        "rounded-[28px] border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.7)] backdrop-blur tkad-neon-border",
        className,
      )}
    >
      <p className="tkad-type-label dark:text-white text-gray-500">
        [ MEMBERS ONLY ]
      </p>
      <h2 className="mt-3 flex items-center gap-2 text-xl font-bold tracking-tight dark:text-white text-gray-900">
        <LockKeyhole className="h-5 w-5 dark:text-white text-gray-800" />
        {title}
      </h2>
      <p className="mt-3 text-sm leading-relaxed dark:text-white">{body}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={loginHref}
          className="inline-flex items-center gap-2 rounded-full border border-hermes/40 bg-hermes/15 px-5 py-3 tkad-type-label dark:text-white text-gray-900 transition-colors hover:bg-hermes/20"
        >
          {isKo ? "로그인하고 계속하기" : "Sign in to continue"}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
