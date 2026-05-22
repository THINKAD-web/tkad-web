import { redirect } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ref?: string }>;
};

/** `/join?ref=userId` → 회원가입 + 초대 추적 */
export default async function JoinPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { ref } = await searchParams;
  const q = ref?.trim() ? `?ref=${encodeURIComponent(ref.trim())}` : "";
  redirect({ href: `/register${q}`, locale });
}
