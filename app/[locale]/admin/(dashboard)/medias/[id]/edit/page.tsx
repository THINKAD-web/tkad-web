import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import MediaJsonEditClient from "./media-json-edit-client";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function AdminMediaJsonEditPage({ params }: Props) {
  const { locale, id } = await params;
  const resolved = await resolveLocaleParam(Promise.resolve({ locale }));
  setRequestLocale(resolved);
  return <MediaJsonEditClient mediaId={id} />;
}
