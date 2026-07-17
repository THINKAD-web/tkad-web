import { Link } from "@/i18n/navigation";
import { KAKAO_CHANNEL_PUBLIC_URL } from "@/lib/kakao-public";
import { CONTACT_EMAIL } from "@/lib/constants";
import { MessageCircle, Mail, Phone } from "lucide-react";

type Props = {
  isKo: boolean;
  phone: string;
};

export function HowToUseCta({ isKo, phone }: Props) {
  return (
    <div className="tkad-glass-surface mt-16 rounded-[28px] border border-gray-200 p-8 text-center backdrop-blur dark:border-white/12 sm:p-10">
      <h2 className="text-xl font-black tracking-tight dark:text-white text-gray-900 sm:text-2xl">
        {isKo ? "아직 궁금한 점이 있으신가요?" : "Still have questions?"}
      </h2>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
        <a
          href={KAKAO_CHANNEL_PUBLIC_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FEE500] px-5 py-3 text-sm font-bold text-[#191919] transition-opacity hover:opacity-90"
        >
          <MessageCircle className="h-4 w-4" />
          {isKo ? "카카오톡 상담" : "Kakao chat"}
        </a>
        <a
          href={`tel:${phone.replace(/-/g, "")}`}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-5 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/15"
        >
          <Phone className="h-4 w-4" />
          {isKo ? "전화 상담" : "Call us"}
        </a>
        <Link
          href="/contact"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border dark:border-white/14 border-gray-200 px-5 py-3 text-sm font-bold dark:text-white text-gray-900 transition-colors hover:bg-muted/40"
        >
          <Mail className="h-4 w-4" />
          {isKo ? "이메일 문의" : "Email inquiry"}
        </Link>
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">
        {phone} · {CONTACT_EMAIL}
      </p>
    </div>
  );
}
