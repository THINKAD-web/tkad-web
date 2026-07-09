"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  adminMobileCardClass,
  adminMobileListClass,
  adminMobileTouchBtnClass,
} from "@/components/admin/admin-quote-page-shell";

export function AdminMobileList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <ul className={cn(adminMobileListClass, className)}>{children}</ul>;
}

export function AdminMobileCard({
  children,
  className,
  id,
  cardRef,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  cardRef?: (el: HTMLLIElement | null) => void;
}) {
  return (
    <li
      id={id}
      ref={cardRef}
      className={cn(adminMobileCardClass, className)}
    >
      {children}
    </li>
  );
}

export { adminMobileTouchBtnClass };
