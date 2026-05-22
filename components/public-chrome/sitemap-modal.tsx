"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { SitemapSection } from "@/lib/navigation/sitemap-sections";

type Props = {
  open: boolean;
  onClose: () => void;
  sections: SitemapSection[];
  closeLabel: string;
  dialogLabel: string;
};

export function SitemapModal({
  open,
  onClose,
  sections,
  closeLabel,
  dialogLabel,
}: Props) {
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={dialogLabel}
      className="fixed inset-0 z-50 flex flex-col bg-white/95 backdrop-blur-md dark:bg-[#020202]/95"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label={closeLabel}
      >
        <X className="h-5 w-5" aria-hidden />
      </button>

      <div className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto px-6 py-16 sm:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <section key={section.id} aria-labelledby={`sitemap-${section.id}`}>
              <h2
                id={`sitemap-${section.id}`}
                className="font-mono text-[11px] font-black uppercase tracking-[0.22em] text-gray-900 dark:text-white"
              >
                {section.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {section.links.map((link) => (
                  <li key={`${section.id}-${link.href}-${link.label}`}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onClose}
                        className="text-sm font-medium text-gray-600 transition hover:text-gray-900 dark:text-white/70 dark:hover:text-white"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        onClick={onClose}
                        className="text-sm font-medium text-gray-600 transition hover:text-gray-900 dark:text-white/70 dark:hover:text-white"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
