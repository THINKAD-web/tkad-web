"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Pencil } from "lucide-react";

/**
 * Shows admin edit link only when the browser has a valid admin session cookie.
 */
export default function MediaDetailAdminActions({
  className = "",
}: {
  className?: string;
}) {
  const t = useTranslations("media.detail");
  const [admin, setAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/auth/session", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { admin?: boolean }) => {
        if (!cancelled) {
          setAdmin(!!d.admin);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAdmin(false);
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready || !admin) return null;

  return (
    <Link
      href="/admin/medias"
      className={`inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/20 ${className}`}
    >
      <Pencil className="h-3.5 w-3.5" />
      {t("adminEdit")}
    </Link>
  );
}
