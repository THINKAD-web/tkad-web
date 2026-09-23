import type { ReactNode } from "react";
import { SitePublicLayout } from "@/components/site-public-layout";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function SiteLayout({ children, params }: Props) {
  const { locale } = await params;

  return (
    <SitePublicLayout locale={locale}>{children}</SitePublicLayout>
  );
}
